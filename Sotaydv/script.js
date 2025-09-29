document.addEventListener("DOMContentLoaded", function () {
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxpimlKEJGclLedbBfjrZhxT72Z48IttcRmzR7GKF8P6B0hJSh1iCcqGzRoGQEX-GHV/exec"; // <<=== DÁN URL WEB APP CỦA BẠN VÀO ĐÂY

  // =================================================================
  // LẤY CÁC THÀNH PHẦN GIAO DIỆN (DOM ELEMENTS)
  // =================================================================
  const form = document.getElementById("dataForm");
  const unitSelect = document.getElementById("tenDonVi");
  const dataInput = document.getElementById("soLieu");
  const statusDiv = document.getElementById("status");
  const submitButton = document.getElementById("submitButton");
  const buttonText = document.getElementById("button-text");
  const buttonSpinner = document.getElementById("button-spinner");

  const confirmModal = new bootstrap.Modal(
    document.getElementById("confirmModal")
  );
  const modalBodyMessage = document.getElementById("modalBodyMessage");
  const confirmReplaceBtn = document.getElementById("confirmReplaceBtn");

  let isSubmitting = false; // Biến trạng thái để tránh gửi nhiều lần

  // =================================================================
  // CÁC HÀM CHÍNH
  // =================================================================

  // --- Hàm tải danh sách đơn vị ---
  const fetchUnits = async () => {
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Network response was not ok.");
      const result = await response.json();
      if (result.status !== "success") throw new Error(result.message);

      unitSelect.innerHTML =
        '<option value="" disabled selected>-- Vui lòng chọn một đơn vị --</option>';
      result.data.forEach((unit) => unitSelect.add(new Option(unit, unit)));
    } catch (error) {
      unitSelect.innerHTML =
        '<option value="" disabled selected>Lỗi tải danh sách</option>';
      showStatus(`Lỗi tải danh sách đơn vị: ${error.message}`, "danger");
    }
  };

  // --- Hàm gửi dữ liệu ---
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const data = {
      tenDonVi: unitSelect.value,
      soLieu: dataInput.value,
    };

    await submitData(data);
  };

  // --- Hàm logic chính để giao tiếp với Apps Script ---
  const submitData = async (data, replace = false) => {
    setSubmitting(true);
    data.replaceData = replace;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "cors", // Thêm mode cors để xử lý tốt hơn
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), // Gửi dưới dạng JSON chuẩn
      });

      if (!response.ok) throw new Error(`Lỗi server: ${response.statusText}`);
      const result = await response.json();

      if (result.status === "exists") {
        modalBodyMessage.textContent = result.message;
        confirmModal.show();

        confirmReplaceBtn.onclick = async () => {
          confirmModal.hide();
          await submitData(data, true);
        };
      } else if (result.status === "success") {
        showStatus(result.message, "success");
        form.reset();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      showStatus(`Gửi dữ liệu thất bại: ${error.message}`, "danger");
    } finally {
      // Khối này LUÔN LUÔN chạy, dù thành công hay thất bại
      setSubmitting(false);
      // Dọn dẹp thủ công để đảm bảo 100%
      const backdrop = document.querySelector(".modal-backdrop");
      if (backdrop) backdrop.remove();
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    }
  };

  // =================================================================
  // CÁC HÀM TIỆN ÍCH
  // =================================================================
  const setSubmitting = (submitting) => {
    isSubmitting = submitting;
    submitButton.disabled = submitting;
    buttonText.textContent = submitting ? "Đang xử lý..." : "Gửi dữ liệu";
    buttonSpinner.classList.toggle("d-none", !submitting);
  };

  const showStatus = (message, type) => {
    statusDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    setTimeout(() => {
      statusDiv.innerHTML = "";
    }, 5000);
  };

  // =================================================================
  // KHỞI CHẠY
  // =================================================================
  form.addEventListener("submit", handleFormSubmit);
  fetchUnits();
});
