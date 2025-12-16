// --- CẤU HÌNH ---
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyDA5QbkkianGeNgcjU4Y6Jsyb-qKCJqnXEVL_c-4aIeG4wJxfZveQmrqEQOYonDYNTdg/exec";

// --- KHAI BÁO BIẾN ---
const form = document.getElementById("cadresForm");
const tableBody = document.getElementById("tableBody");
const selectDonVi = document.getElementById("donVi");
const selectChucVu = document.getElementById("chucVu");
// Các biến mới cho chức năng tìm kiếm
const searchInput = document.getElementById("searchInput");
const filterChucVu = document.getElementById("filterChucVu");
const noResultDiv = document.getElementById("noResult");

const loadingText = document.getElementById("loadingText");
const btnSubmit = document.getElementById("btnSubmit");
const btnCancel = document.getElementById("btnCancel");
const statusMessage = document.getElementById("statusMessage");

// Biến lưu trữ dữ liệu gốc để lọc
let globalData = [];

// 1. KHỞI CHẠY: Tải dữ liệu khi mở trang
document.addEventListener("DOMContentLoaded", loadAllData);

async function loadAllData() {
  loadingText.style.display = "block";
  tableBody.innerHTML = "";

  try {
    const response = await fetch(SCRIPT_URL);
    const data = await response.json();

    // A. Đổ dữ liệu vào Dropdown nhập liệu
    fillDropdown(selectDonVi, data.donVi);
    fillDropdown(selectChucVu, data.chucVu);

    // B. Đổ dữ liệu vào Dropdown LỌC (Cái này mới)
    // Ta thêm một option "Tất cả" đầu tiên, rồi mới thêm danh sách chức vụ
    fillDropdown(filterChucVu, data.chucVu, true);

    // C. Lưu và vẽ bảng
    globalData = data.danhSach;
    renderTable(globalData); // Vẽ toàn bộ danh sách ban đầu
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối! Kiểm tra lại đường dẫn Script.");
  } finally {
    loadingText.style.display = "none";
  }
}

// Hàm hỗ trợ điền dropdown
function fillDropdown(selectElement, items, isFilter = false) {
  // Giữ lại option đầu tiên (Ví dụ: -- Chọn -- hoặc -- Tất cả --)
  const firstOption = selectElement.options[0];
  selectElement.innerHTML = "";
  selectElement.appendChild(firstOption);

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    selectElement.appendChild(opt);
  });
}

// 2. CHỨC NĂNG TÌM KIẾM & LỌC (LOGIC MỚI)
// Lắng nghe sự kiện khi gõ phím hoặc chọn dropdown
searchInput.addEventListener("input", filterData);
filterChucVu.addEventListener("change", filterData);

function filterData() {
  const keyword = searchInput.value.toLowerCase().trim();
  const selectedRole = filterChucVu.value;

  // Lọc mảng globalData
  const filtered = globalData.filter((item) => {
    // Kiểm tra tên hoặc đơn vị có chứa từ khóa không
    const matchKeyword =
      item.hoTen.toLowerCase().includes(keyword) ||
      item.donVi.toLowerCase().includes(keyword);

    // Kiểm tra chức vụ (nếu chọn "Tất cả" thì luôn đúng, ngược lại phải trùng khớp)
    const matchRole = selectedRole === "" || item.chucVu === selectedRole;

    return matchKeyword && matchRole;
  });

  renderTable(filtered);
}

// 3. HÀM VẼ BẢNG
function renderTable(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    noResultDiv.style.display = "block";
  } else {
    noResultDiv.style.display = "none";
    list.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${index + 1}</td>
                <td style="font-weight:bold; color:#0056b3;">${item.hoTen}</td>
                <td>${item.donVi}</td>
                <td><span style="background:#e8f0fe; color:#1967d2; padding:2px 8px; border-radius:12px; font-size:12px;">${
                  item.chucVu
                }</span></td>
                <td>${item.sdt}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="prepareEdit('${
                      item.rowIndex
                    }')">Sửa</button>
                    <button class="action-btn btn-delete" onclick="deleteItem('${
                      item.rowIndex
                    }')">Xóa</button>
                </td>
            `;
      tableBody.appendChild(tr);
    });
  }
}

// 4. CÁC HÀM XỬ LÝ SỬA / XÓA (Giữ nguyên logic cũ nhưng cập nhật UI)
window.prepareEdit = function (rowIndex) {
  // Tìm item trong globalData dựa trên rowIndex
  const item = globalData.find((x) => x.rowIndex == rowIndex);
  if (!item) return;

  document.getElementById("rowIndex").value = item.rowIndex;
  document.getElementById("hoTen").value = item.hoTen;
  document.getElementById("sdt").value = item.sdt;
  document.getElementById("donVi").value = item.donVi;
  document.getElementById("chucVu").value = item.chucVu;

  // Đổi trạng thái nút
  btnSubmit.textContent = "Cập Nhật";
  btnSubmit.classList.add("btn-warning");
  btnCancel.style.display = "inline-block";

  // Cuộn lên form
  document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
};

window.resetForm = function () {
  form.reset();
  document.getElementById("rowIndex").value = "";
  btnSubmit.textContent = "Lưu thông tin";
  btnCancel.style.display = "none";
};

window.deleteItem = function (rowIndex) {
  Swal.fire({
    title: "Bạn có chắc chắn?",
    text: "Dữ liệu sau khi xóa sẽ không thể khôi phục!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545", // Màu đỏ cho nút Xóa
    cancelButtonColor: "#6c757d", // Màu xám cho nút Hủy
    confirmButtonText: "Vâng, xóa đi!",
    cancelButtonText: "Hủy bỏ",
  }).then(async (result) => {
    if (result.isConfirmed) {
      // Nếu người dùng bấm "Đồng ý xóa" thì mới gửi lệnh
      showStatus("Đang xóa...", "blue");

      // Gọi hàm gửi dữ liệu nhưng xử lý kết quả ngay tại đây để hiện thông báo đẹp
      await sendData({ action: "delete", rowIndex: rowIndex }, true);
    }
  });
};
// 5. XỬ LÝ SUBMIT FORM
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rowIndex = document.getElementById("rowIndex").value;
  const action = rowIndex ? "edit" : "add";

  const formData = {
    action: action,
    rowIndex: rowIndex,
    hoTen: document.getElementById("hoTen").value,
    donVi: document.getElementById("donVi").value,
    chucVu: document.getElementById("chucVu").value,
    sdt: document.getElementById("sdt").value,
  };

  btnSubmit.disabled = true;
  showStatus("Đang xử lý...", "blue");

  await sendData(formData);
});

// Hàm gửi dữ liệu (Đã nâng cấp thông báo)
async function sendData(dataObj, isDelete = false) {
  // Nếu là xóa thì không cần disable nút submit, ngược lại thì cần
  if (!isDelete) btnSubmit.disabled = true;

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(dataObj),
      mode: "no-cors",
    });

    // --- HIỆN THÔNG BÁO THÀNH CÔNG ĐẸP MẮT ---
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end", // Hiện góc trên phải
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });

    Toast.fire({
      icon: "success",
      title: isDelete ? "Đã xóa thành công!" : "Đã lưu thông tin!",
    });
    // ---------------------------------------------

    if (!isDelete) resetForm(); // Nếu không phải xóa thì reset form
    loadAllData(); // Tải lại bảng
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Lỗi!",
      text: "Có lỗi xảy ra khi kết nối tới Server.",
    });
    console.error(error);
  } finally {
    if (!isDelete) btnSubmit.disabled = false;
    statusMessage.textContent = ""; // Xóa dòng chữ loading cũ nếu có
  }
}

function showStatus(msg, color) {
  statusMessage.textContent = msg;
  statusMessage.style.color = color;
}
