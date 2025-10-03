const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";
let allUnits = [];
let form, donViSelect, tongSoDangVienInput, soDaCaiDatInput, submitBtn;
let messageDiv, dataTableBody, dateFilterInput, resetFilterBtn;
let modal, modalMessage, confirmBtn, cancelBtn;
let missingModal,
  closeMissingBtn,
  missingListEl,
  missingUnitsTitleSub,
  checkMissingBtn,
  adminDateFilter,
  adminControls;
let totalMembersSumEl, totalInstalledSumEl, totalPercentageEl;

// --- CÁC HÀM CHỨC NĂNG ---

// Hàm tải và hiển thị dữ liệu bảng
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
          totalMembersSumEl.textContent = "0";
          totalInstalledSumEl.textContent = "0";
          totalPercentageEl.textContent = "0.0%";
        } else {
          const totalMembers = data.reduce(
            (sum, row) => sum + Number(row[2] || 0),
            0
          );
          const totalInstalled = data.reduce(
            (sum, row) => sum + Number(row[3] || 0),
            0
          );
          const overallPercentage =
            totalMembers > 0
              ? ((totalInstalled / totalMembers) * 100).toFixed(1)
              : 0;
          totalMembersSumEl.textContent = totalMembers;
          totalInstalledSumEl.textContent = totalInstalled;
          totalPercentageEl.textContent = `${overallPercentage}%`;

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
      console.error("Lỗi khi tải dữ liệu bảng:", error);
      dataTableBody.innerHTML = `<tr><td colspan="6">Lỗi: ${error.message}</td></tr>`;
    });
}

// Hàm hiển thị modal xác nhận
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

// Hàm hiển thị thông báo
function showMessage(type, text) {
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  setTimeout(() => {
    messageDiv.className = "message";
    messageDiv.textContent = "";
  }, 3000);
}

// Hàm gửi dữ liệu lên server
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

// --- LOGIC CHÍNH KHI TRANG TẢI XONG ---
document.addEventListener("DOMContentLoaded", () => {
  // Lấy tất cả các phần tử DOM cần thiết
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
  missingUnitsTitleSub = document.getElementById("missingUnitsTitleSub");
  checkMissingBtn = document.getElementById("checkMissingBtn");
  adminDateFilter = document.getElementById("missingDateFilter");
  adminControls = document.querySelector(".admin-only");
  totalMembersSumEl = document.getElementById("totalMembersSum");
  totalInstalledSumEl = document.getElementById("totalInstalledSum");
  totalPercentageEl = document.getElementById("totalPercentage");

  // Khởi tạo dropdown có tìm kiếm
  const choices = new Choices(donViSelect, {
    searchPlaceholderValue: "Gõ để tìm kiếm...",
    itemSelectText: "Nhấn để chọn",
  });

  // Logic phân quyền Admin
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get("admin") === "true";
  if (isAdmin) {
    adminControls.style.display = "inline-flex";
    checkMissingBtn.textContent = "Kiểm tra ĐV chưa báo cáo";
  }

  // Tải danh sách đơn vị
  fetch(SCRIPT_URL)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        allUnits = data.data;
        choices.clearStore();
        choices.setChoices([
          {
            value: "",
            label: "-- Chọn đơn vị --",
            selected: true,
            disabled: true,
          },
        ]);
        const unitChoices = allUnits.map((unit) => ({
          value: unit,
          label: unit,
        }));
        choices.setChoices(unitChoices, "value", "label", false);
      } else {
        choices.clearStore();
        choices.setChoices([
          {
            value: "",
            label: "Lỗi tải danh sách",
            selected: true,
            disabled: true,
          },
        ]);
      }
    });

  // Tải bảng dữ liệu ban đầu
  fetchAndDisplayData();

  // Gắn sự kiện cho form
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

  // Gắn sự kiện cho các bộ lọc
  dateFilterInput.addEventListener("change", () =>
    fetchAndDisplayData(dateFilterInput.value)
  );
  resetFilterBtn.addEventListener("click", () => {
    dateFilterInput.value = "";
    fetchAndDisplayData();
  });

  // Gắn sự kiện cho nút kiểm tra đơn vị thiếu
  checkMissingBtn.addEventListener("click", () => {
    checkMissingBtn.disabled = true;
    checkMissingBtn.textContent = "Đang kiểm tra...";
    let checkDateStr;
    if (isAdmin && adminDateFilter.value) {
      checkDateStr = adminDateFilter.value;
    } else {
      checkDateStr = new Date().toISOString().split("T")[0];
    }
    const displayDate = new Date(checkDateStr + "T00:00:00").toLocaleDateString(
      "vi-VN"
    );
    missingUnitsTitleSub.textContent = `Các đơn vị chưa báo cáo ngày ${displayDate}`;
    fetch(`${SCRIPT_URL}?action=getDataCaiDat&date=${checkDateStr}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.status === "success") {
          const reportedUnitsOnDate = result.data.map((row) => row[1]);
          const missingUnits = allUnits.filter(
            (unit) => !reportedUnitsOnDate.includes(unit)
          );
          missingListEl.innerHTML = "";
          if (missingUnits.length > 0) {
            missingUnits.forEach((unit) => {
              const li = document.createElement("li");
              li.textContent = unit;
              missingListEl.appendChild(li);
            });
          } else {
            missingListEl.innerHTML = `<li>Tất cả các đơn vị đã báo cáo trong ngày ${displayDate}.</li>`;
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
        checkMissingBtn.disabled = false;
        checkMissingBtn.textContent = isAdmin
          ? "Kiểm tra ĐV chưa báo cáo"
          : "ĐV chưa báo cáo hôm nay";
      });
  });

  // Gắn sự kiện đóng modal
  closeMissingBtn.addEventListener("click", () =>
    missingModal.classList.remove("visible")
  );
  missingModal.addEventListener("click", (e) => {
    if (e.target === missingModal) {
      missingModal.classList.remove("visible");
    }
  });
});
