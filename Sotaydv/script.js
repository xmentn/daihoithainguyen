const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec"; // <<=== DÙNG URL CỦA BẠN
let allUnits = [];
let reportedUnits = [];

let form,
  donViSelect,
  soLieuInput,
  submitBtn,
  messageDiv,
  dataTableBody,
  totalSumEl;
let modal, modalMessage, confirmBtn, cancelBtn;
let missingModal, closeMissingBtn, missingListEl, showMissingBtn;

// Hàm tải và hiển thị dữ liệu (ĐÃ CẬP NHẬT)
function fetchAndDisplayData() {
  dataTableBody.innerHTML = '<tr><td colspan="3">Đang tải dữ liệu...</td></tr>';
  // THAY ĐỔI QUAN TRỌNG: Thêm action=getDataTapHuan
  fetch(`${SCRIPT_URL}?action=getDataTapHuan`)
    .then((response) => response.json())
    .then((result) => {
      if (result.status === "success") {
        const data = result.data;
        data.sort((a, b) => a[1].localeCompare(b[1], "vi"));
        reportedUnits = data.map((row) => row[1]);
        dataTableBody.innerHTML = "";
        if (data.length === 0) {
          dataTableBody.innerHTML =
            '<tr><td colspan="3">Chưa có dữ liệu.</td></tr>';
          totalSumEl.textContent = "0";
        } else {
          const total = data.reduce((sum, row) => sum + Number(row[2] || 0), 0);
          totalSumEl.textContent = total;
          data.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${row[1]}</td>
                            <td style="text-align: right;">${row[2]}</td>
                        `;
            dataTableBody.appendChild(tr);
          });
        }
      } else {
        throw new Error(result.message);
      }
    })
    .catch((error) => {
      console.error("Lỗi khi tải bảng dữ liệu:", error);
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

document.addEventListener("DOMContentLoaded", () => {
  form = document.getElementById("dataForm");
  donViSelect = document.getElementById("tenDonVi");
  soLieuInput = document.getElementById("soLieu");
  submitBtn = document.getElementById("submitBtn");
  messageDiv = document.getElementById("message");
  dataTableBody = document.getElementById("dataTableBody");
  totalSumEl = document.getElementById("totalSum");
  modal = document.getElementById("confirmationModal");
  modalMessage = document.getElementById("modalMessage");
  confirmBtn = document.getElementById("confirmBtn");
  cancelBtn = document.getElementById("cancelBtn");
  missingModal = document.getElementById("missingUnitsModal");
  closeMissingBtn = document.getElementById("closeMissingBtn");
  missingListEl = document.getElementById("missingUnitsList");
  showMissingBtn = document.getElementById("showMissingBtn");

  // Tải danh sách đơn vị (gọi không có action)
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

  fetchAndDisplayData();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang gửi...";
    const payload = {
      sheetName: "Tổng hợp",
      tenDonVi: donViSelect.value,
      soLieu: soLieuInput.value,
      replaceData: false,
    };
    submitData(payload);
  });

  showMissingBtn.addEventListener("click", () => {
    const missingUnits = allUnits.filter(
      (unit) => !reportedUnits.includes(unit)
    );
    missingListEl.innerHTML = "";
    if (missingUnits.length > 0) {
      missingUnits.forEach((unit) => {
        const li = document.createElement("li");
        li.textContent = unit;
        missingListEl.appendChild(li);
      });
    } else {
      missingListEl.innerHTML = "<li>Tất cả các đơn vị đã báo cáo.</li>";
    }
    missingModal.classList.add("visible");
  });

  closeMissingBtn.addEventListener("click", () => {
    missingModal.classList.remove("visible");
  });
  missingModal.addEventListener("click", (e) => {
    if (e.target === missingModal) {
      missingModal.classList.remove("visible");
    }
  });
});

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
