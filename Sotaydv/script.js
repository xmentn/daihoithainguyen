// DÁN URL ỨNG DỤNG WEB CỦA BẠN VÀO ĐÂY
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec"; // <<=== GIỮ NGUYÊN URL CỦA BẠN

// Di chuyển tất cả các biến liên quan đến DOM vào trong DOMContentLoaded
let form, donViSelect, soLieuInput, submitBtn, messageDiv;
let modal, modalMessage, confirmBtn, cancelBtn;

// Hàm hiển thị thông báo
function showMessage(type, text) {
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  setTimeout(() => {
    messageDiv.className = "message";
    messageDiv.textContent = "";
  }, 5000);
}

// HÀM HIỂN THỊ MODAL XÁC NHẬN
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

// Chỉ thực thi mã sau khi toàn bộ HTML đã được tải
document.addEventListener("DOMContentLoaded", () => {
  // *** THAY ĐỔI QUAN TRỌNG NHẤT NẰM Ở ĐÂY ***
  // Lấy tất cả các phần tử HTML sau khi trang đã sẵn sàng
  form = document.getElementById("dataForm");
  donViSelect = document.getElementById("tenDonVi");
  soLieuInput = document.getElementById("soLieu");
  submitBtn = document.getElementById("submitBtn");
  messageDiv = document.getElementById("message");
  modal = document.getElementById("confirmationModal");
  modalMessage = document.getElementById("modalMessage");
  confirmBtn = document.getElementById("confirmBtn");
  cancelBtn = document.getElementById("cancelBtn");
  // *** KẾT THÚC THAY ĐỔI ***

  // Tải danh sách đơn vị
  fetch(SCRIPT_URL)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        donViSelect.innerHTML = '<option value="">-- Chọn đơn vị --</option>';
        data.data.forEach((donVi) => {
          const option = document.createElement("option");
          option.value = donVi;
          option.textContent = donVi;
          donViSelect.appendChild(option);
        });
      } else {
        throw new Error(data.message);
      }
    })
    .catch((error) => {
      console.error("Lỗi khi tải danh sách đơn vị:", error);
      donViSelect.innerHTML =
        '<option value="">Không thể tải danh sách</option>';
      showMessage("error", "Lỗi: Không thể tải danh sách đơn vị.");
    });

  // Xử lý khi gửi form
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const tenDonVi = donViSelect.value;
    const soLieu = soLieuInput.value;

    if (!tenDonVi || soLieu === "") {
      showMessage("error", "Vui lòng chọn đơn vị và nhập số liệu.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Đang gửi...";

    submitData({ tenDonVi, soLieu, replaceData: false });
  });
});

// Hàm gửi dữ liệu (async function)
async function submitData(payload) {
  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(payload),
  })
    .then((res) =>
      res
        .clone()
        .json()
        .catch(() => res.text())
    )
    .then(async (result) => {
      if (typeof result === "string") {
        try {
          result = JSON.parse(result);
        } catch (e) {
          throw new Error("Phản hồi từ server không hợp lệ.");
        }
      }

      if (result.status === "success") {
        showMessage("success", result.message);
        form.reset();
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
      console.error("Lỗi khi gửi dữ liệu:", error);
      showMessage("error", `Gửi dữ liệu thất bại: ${error.message}`);
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gửi Dữ Liệu";
    });
}
