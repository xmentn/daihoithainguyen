document.addEventListener("DOMContentLoaded", function () {
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxpimlKEJGclLedbBfjrZhxT72Z48IttcRmzR7GKF8P6B0hJSh1iCcqGzRoGQEX-GHV/exec"; // <<=== DÁN URL WEB APP CỦA BẠN VÀO ĐÂY

  // --- 1. LẤY CÁC THÀNH PHẦN GIAO DIỆN ---
  const form = document.getElementById("dataForm");
  const unitSelect = document.getElementById("tenDonVi");
  const statusDiv = document.getElementById("status");
  const submitButton = document.getElementById("submitButton");
  const buttonText = document.getElementById("button-text");
  const buttonSpinner = document.getElementById("button-spinner");

  // --- 2. KHỞI TẠO VÀ LẤY CÁC THÀNH PHẦN CỦA MODAL ---
  const confirmModalElement = document.getElementById("confirmModal");
  const confirmModal = new bootstrap.Modal(confirmModalElement);
  const modalBodyMessage = document.getElementById("modalBodyMessage");
  const confirmReplaceBtn = document.getElementById("confirmReplaceBtn");

  // --- 3. LẤY DANH SÁCH ĐƠN VỊ TỪ GOOGLE SHEET ---
  async function fetchUnits() {
    try {
      const response = await fetch(SCRIPT_URL);
      const result = await response.json();

      if (result.status === "success") {
        unitSelect.innerHTML =
          '<option value="" disabled selected>-- Vui lòng chọn một đơn vị --</option>';
        result.data.forEach((unit) => {
          const option = new Option(unit, unit);
          unitSelect.add(option);
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      unitSelect.innerHTML =
        '<option value="" disabled selected>Lỗi tải danh sách</option>';
      showStatus(`Không thể tải danh sách đơn vị: ${error.message}`, "danger");
    }
  }

  // --- 4. XỬ LÝ GỬI FORM ---
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    sendData(data); // Gửi lần đầu, không ghi đè
  });

  async function sendData(data, replace = false) {
    setLoading(true);
    data.replaceData = replace; // Thêm cờ cho biết có ghi đè hay không

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.status === "exists") {
        setLoading(false);
        modalBodyMessage.textContent = result.message;
        confirmModal.show();

        // =======================================================
        // --- LOGIC MỚI: SỬA LỖI MÀN HÌNH TỐI ---
        // =======================================================
        // Gán sự kiện cho nút "Đồng ý Ghi đè"
        confirmReplaceBtn.onclick = () => {
          // 1. Gắn một trình nghe sự kiện CHẠY MỘT LẦN DUY NHẤT
          //    sự kiện này chỉ kích hoạt SAU KHI modal đã ẩn hoàn toàn.
          confirmModalElement.addEventListener(
            "hidden.bs.modal",
            () => {
              sendData(data, true); // 2. Gửi lại yêu cầu ghi đè
            },
            { once: true }
          ); // {once: true} đảm bảo nó chỉ chạy 1 lần

          // 3. Bây giờ mới ra lệnh cho modal bắt đầu ẩn đi
          confirmModal.hide();
        };
        // =======================================================
      } else if (result.status === "success") {
        showStatus(result.message, "success");
        form.reset();
        setLoading(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      showStatus(`Đã xảy ra lỗi: ${error.message}`, "danger");
      setLoading(false);
    }
  }

  // --- 5. CÁC HÀM TIỆN ÍCH ---
  function setLoading(isLoading) {
    if (isLoading) {
      submitButton.disabled = true;
      buttonText.textContent = "Đang xử lý...";
      buttonSpinner.classList.remove("d-none");
    } else {
      submitButton.disabled = false;
      buttonText.textContent = "Gửi dữ liệu";
      buttonSpinner.classList.add("d-none");
    }
  }

  function showStatus(message, type) {
    statusDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    setTimeout(() => {
      statusDiv.innerHTML = "";
    }, 5000);
  }

  // --- KHỞI CHẠY ---
  fetchUnits();
});
