// --- CẤU HÌNH ---
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyDA5QbkkianGeNgcjU4Y6Jsyb-qKCJqnXEVL_c-4aIeG4wJxfZveQmrqEQOYonDYNTdg/exec";

// --- KHAI BÁO BIẾN ---
const form = document.getElementById("cadresForm");
const tableBody = document.getElementById("tableBody");
const selectDonVi = document.getElementById("donVi");
const selectChucVu = document.getElementById("chucVu");

// Các biến cho chức năng tìm kiếm
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

    // B. Đổ dữ liệu vào Dropdown LỌC
    fillDropdown(filterChucVu, data.chucVu, true);

    // C. Lưu và vẽ bảng
    globalData = data.danhSach;
    renderTable(globalData);
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối! Kiểm tra lại đường dẫn Script.");
  } finally {
    loadingText.style.display = "none";
  }
}

// Hàm hỗ trợ điền dropdown
function fillDropdown(selectElement, items, isFilter = false) {
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

// 2. CHỨC NĂNG TÌM KIẾM & LỌC
searchInput.addEventListener("input", filterData);
filterChucVu.addEventListener("change", filterData);

function filterData() {
  const keyword = searchInput.value.toLowerCase().trim();
  const selectedRole = filterChucVu.value;

  // Lọc mảng globalData
  const filtered = globalData.filter((item) => {
    // Kiểm tra tên, đơn vị HOẶC EMAIL có chứa từ khóa không
    const matchKeyword =
      item.hoTen.toLowerCase().includes(keyword) ||
      item.donVi.toLowerCase().includes(keyword) ||
      (item.email && item.email.toLowerCase().includes(keyword)); // Tìm cả trong email

    // Kiểm tra chức vụ
    const matchRole = selectedRole === "" || item.chucVu === selectedRole;

    return matchKeyword && matchRole;
  });

  renderTable(filtered);
}

// 3. HÀM VẼ BẢNG
// 3. HÀM VẼ BẢNG (Đã sửa lỗi lệch cột)
function renderTable(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    noResultDiv.style.display = "block";
  } else {
    noResultDiv.style.display = "none";
    list.forEach((item, index) => {
      const tr = document.createElement("tr");

      // CHÚ Ý: Thứ tự các thẻ <td> phải khớp với thứ tự <th> bên HTML
      tr.innerHTML = `
                <td style="text-align: center;">${index + 1}</td>
                <td style="font-weight:bold; color:#0056b3;">${item.hoTen}</td>
                <td>${item.donVi}</td>
                <td><span style="background:#e8f0fe; color:#1967d2; padding:2px 8px; border-radius:12px; font-size:12px;">${
                  item.chucVu
                }</span></td>
                <td style="text-align: center;">${item.sdt}</td>
                
                <td>${item.email || ""}</td> 
                
                <td style="text-align: center;">
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

// 4. CÁC HÀM XỬ LÝ SỬA / XÓA
window.prepareEdit = function (rowIndex) {
  const item = globalData.find((x) => x.rowIndex == rowIndex);
  if (!item) return;

  document.getElementById("rowIndex").value = item.rowIndex;
  document.getElementById("hoTen").value = item.hoTen;
  document.getElementById("sdt").value = item.sdt;
  document.getElementById("email").value = item.email || ""; // Điền Email vào ô input
  document.getElementById("donVi").value = item.donVi;
  document.getElementById("chucVu").value = item.chucVu;

  btnSubmit.textContent = "Cập Nhật";
  btnSubmit.classList.add("btn-warning");
  btnCancel.style.display = "inline-block";

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
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Vâng, xóa đi!",
    cancelButtonText: "Hủy bỏ",
  }).then(async (result) => {
    if (result.isConfirmed) {
      showStatus("Đang xóa...", "blue");
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
    email: document.getElementById("email").value, // Lấy giá trị Email từ form
  };

  btnSubmit.disabled = true;
  showStatus("Đang xử lý...", "blue");

  await sendData(formData);
});

// Hàm gửi dữ liệu
async function sendData(dataObj, isDelete = false) {
  if (!isDelete) btnSubmit.disabled = true;

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(dataObj),
      mode: "no-cors",
    });

    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
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

    if (!isDelete) resetForm();
    loadAllData();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Lỗi!",
      text: "Có lỗi xảy ra khi kết nối tới Server.",
    });
    console.error(error);
  } finally {
    if (!isDelete) btnSubmit.disabled = false;
    statusMessage.textContent = "";
  }
}

function showStatus(msg, color) {
  statusMessage.textContent = msg;
  statusMessage.style.color = color;
}
