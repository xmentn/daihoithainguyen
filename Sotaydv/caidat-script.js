// ===================================================================
// DÁN URL ỨNG DỤNG WEB CỦA BẠN VÀO ĐÂY
// ===================================================================
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";
let form,
  donViSelect,
  tongSoDangVienInput,
  soDaCaiDatInput,
  ngayBaoCaoInput,
  submitBtn;
let messageDiv, dataTableBody;

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

// CHẠY SAU KHI HTML TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  form = document.getElementById("dataForm");
  donViSelect = document.getElementById("tenDonVi");
  tongSoDangVienInput = document.getElementById("tongSoDangVien");
  soDaCaiDatInput = document.getElementById("soDaCaiDat");
  ngayBaoCaoInput = document.getElementById("ngayBaoCao");
  submitBtn = document.getElementById("submitBtn");
  messageDiv = document.getElementById("message");
  dataTableBody = document.getElementById("dataTableBody");
  dateFilterInput = document.getElementById("dateFilter");
  resetFilterBtn = document.getElementById("resetFilterBtn");

  ngayBaoCaoInput.valueAsDate = new Date();

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
      }
    });

  fetchAndDisplayData();

  // Lắng nghe sự kiện submit của form
  form.addEventListener("submit", function (e) {
    e.preventDefault(); // Ngăn trang tải lại
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang gửi...";
    const payload = {
      sheetName: "Cài đặt",
      tenDonVi: donViSelect.value,
      tongSoDangVien: tongSoDangVienInput.value,
      soDaCaiDat: soDaCaiDatInput.value,
      ngayBaoCao: ngayBaoCaoInput.value,
    };
    submitData(payload);
  });

  dateFilterInput.addEventListener("change", () => {
    fetchAndDisplayData(dateFilterInput.value);
  });

  resetFilterBtn.addEventListener("click", () => {
    dateFilterInput.value = "";
    fetchAndDisplayData();
  });
});

// Hàm gửi dữ liệu
function submitData(payload) {
  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.status === "success") {
        form.reset();
        ngayBaoCaoInput.valueAsDate = new Date();
        fetchAndDisplayData();
        messageDiv.className = "message success";
        messageDiv.textContent = result.message;
        setTimeout(() => {
          messageDiv.className = "message";
          messageDiv.textContent = "";
        }, 3000);
      } else {
        throw new Error(result.message);
      }
    })
    .catch((error) => {
      messageDiv.className = "message error";
      messageDiv.textContent = `Lỗi: ${error.message}`;
      console.error(error);
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gửi Dữ Liệu";
    });
}
