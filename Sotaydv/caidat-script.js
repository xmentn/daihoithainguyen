// ===================================================================
// DÁN URL ỨNG DỤNG WEB CỦA BẠN VÀO ĐÂY
// ===================================================================
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";
let form, donViSelect, tongSoDangVienInput, soDaCaiDatInput, submitBtn;
let messageDiv, dataTableBody, dateFilterInput, resetFilterBtn;
let modal, modalMessage, confirmBtn, cancelBtn;
let allUnits = [];
let missingModal, closeMissingBtn, missingListEl, showMissingTodayBtn;

// Hàm tải và hiển thị dữ liệu
function fetchAndDisplayData(selectedDate = null) {
  let url = `${SCRIPT_URL}?action=getDataCaiDat`;
  if (selectedDate) {
    url += `&date=${selectedDate}`;
  }
  dataTableBody.innerHTML = '<tr><td colspan="6">Đang tải dữ liệu...</td></tr>';
  fetch(url)
    .then((response) => response.json())
    .then((result) => {
      if (result.status === "success") {
        const data = result.data;
        data.sort((a, b) => a[1].localeCompare(b[1], "vi"));
        dataTableBody.innerHTML = "";
        if (data.length === 0) {
          dataTableBody.innerHTML =
            '<tr><td colspan="6">Không có dữ liệu cho lựa chọn này.</td></tr>';
        } else {
          data.forEach((row, index) => {
            const tr = document.createElement("tr");
            const tongSo = Number(row[2] || 0);
            const daCai = Number(row[3] || 0);
            const tyLe = tongSo > 0 ? ((daCai / tongSo) * 100).toFixed(1) : 0;
            tr.innerHTML = `
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${row[1]}</td>
                            <td style="text-align: right;">${tongSo}</td>
                            <td style="text-align: right;">${daCai}</td>
                            <td style="text-align: right;"><b>${tyLe}%</b></td>
                            <td style="text-align: center;">${row[4]}</td>
                        `;
            dataTableBody.appendChild(tr);
          });
        }
      } else {
        throw new Error(result.message);
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

function showConfirmationModal(message) {
  return new Promise((resolve) => {
    modalMessage.textContent = message;
    modal.classList.add("visible");
    const handleConfirm = () => {
      modal.classList.remove("visible");
      resolve(true);
      cleanup();
    };
    const handleCancel = () => {
      modal.classList.remove("visible");
      resolve(false);
      cleanup();
    };
    const cleanup = () => {
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
    };
    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
  });
}

function showMessage(type, text) {
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  setTimeout(() => {
    messageDiv.className = "message";
    messageDiv.textContent = "";
  }, 3000);
}

// CHẠY SAU KHI HTML TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  // Lấy các phần tử DOM
  form = document.getElementById("dataForm");
  donViSelect = document.getElementById("tenDonVi");
  tongSoDangVienInput = document.getElementById("tongSoDangVien");
  soDaCaiDatInput = document.getElementById("soDaCaiDat");
  submitBtn = document.getElementById("submitBtn");
  messageDiv = document.getElementById("message");
  dataTableBody = document.getElementById("dataTableBody");
  dateFilterInput = document.getElementById("dateFilter");
  resetFilterBtn = document.getElementById("resetFilterBtn");
  modal = document.getElementById("confirmationModal");
  modalMessage = document.getElementById("modalMessage");
  confirmBtn = document.getElementById("confirmBtn");
  cancelBtn = document.getElementById("cancelBtn");
  missingModal = document.getElementById("missingUnitsModal");
  closeMissingBtn = document.getElementById("closeMissingBtn");
  missingListEl = document.getElementById("missingUnitsList");
  showMissingTodayBtn = document.getElementById("showMissingTodayBtn");

  // Tải danh sách đơn vị
  fetch(SCRIPT_URL)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        allUnits = data.data;
        donViSelect.innerHTML = '<option value="">-- Chọn đơn vị --</option>';
        allUnits.forEach((donVi) => {
          const option = document.createElement("option");
          option.value = donVi;
          option.textContent = donVi;
          donViSelect.appendChild(option);
        });
      }
    });

  // Tải bảng dữ liệu ban đầu
  fetchAndDisplayData();

  // Xử lý gửi form
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang gửi...";
    const payload = {
      sheetName: "Cài đặt",
      tenDonVi: donViSelect.value,
      tongSoDangVien: tongSoDangVienInput.value,
      soDaCaiDat: soDaCaiDatInput.value,
      replaceData: false,
    };
    submitData(payload);
  });

  // Các sự kiện cho bộ lọc và modal
  dateFilterInput.addEventListener("change", () =>
    fetchAndDisplayData(dateFilterInput.value)
  );
  resetFilterBtn.addEventListener("click", () => {
    dateFilterInput.value = "";
    fetchAndDisplayData();
  });

  showMissingTodayBtn.addEventListener("click", () => {
    showMissingTodayBtn.disabled = true;
    showMissingTodayBtn.textContent = "Đang kiểm tra...";
    const today = new Date().toISOString().split("T")[0];
    fetch(`${SCRIPT_URL}?action=getDataCaiDat&date=${today}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.status === "success") {
          const reportedTodayUnits = result.data.map((row) => row[1]);
          const missingTodayUnits = allUnits.filter(
            (unit) => !reportedTodayUnits.includes(unit)
          );
          missingListEl.innerHTML = "";
          if (missingTodayUnits.length > 0) {
            missingTodayUnits.forEach((unit) => {
              const li = document.createElement("li");
              li.textContent = unit;
              missingListEl.appendChild(li);
            });
          } else {
            missingListEl.innerHTML =
              "<li>Tất cả các đơn vị đã báo cáo hôm nay.</li>";
          }
          missingModal.classList.add("visible");
        } else {
          throw new Error(result.message);
        }
      })
      .catch((error) => {
        console.error("Lỗi khi kiểm tra:", error);
        alert("Đã có lỗi xảy ra.");
      })
      .finally(() => {
        showMissingTodayBtn.disabled = false;
        showMissingTodayBtn.textContent = "ĐV chưa báo cáo hôm nay";
      });
  });

  closeMissingBtn.addEventListener("click", () =>
    missingModal.classList.remove("visible")
  );
  missingModal.addEventListener("click", (e) => {
    if (e.target === missingModal) {
      missingModal.classList.remove("visible");
    }
  });
});

// Hàm gửi dữ liệu
async function submitData(payload) {
  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then(async (result) => {
      if (result.status === "success") {
        form.reset();
        fetchAndDisplayData();
        showMessage("success", result.message);
      } else if (result.status === "exists") {
        const userConfirmation = await showConfirmationModal(result.message);
        if (userConfirmation) {
          submitData({ ...payload, replaceData: true });
        } else {
          // If user cancels, we still need to re-enable the button.
          // The finally block handles this, but we can show a message.
          showMessage("error", "Hành động đã được hủy.");
        }
      } else {
        throw new Error(result.message);
      }
    })
    .catch((error) => {
      showMessage("error", `Lỗi: ${error.message}`);
      console.error(error);
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gửi Dữ Liệu";
    });
}
