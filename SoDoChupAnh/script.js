function loadDiagram(sheetName) {
  const container = document.getElementById("diagram-container");
  const countElement = document.getElementById("delegate-count");
  const loader = document.getElementById("loader");
  const buttons = document.querySelectorAll(".controls button");

  // === PHẦN CẬP NHẬT ===
  // Xóa các class của lần xem trước
  container.classList.remove("view-bch", "view-toan-the", "view-tang-hoa");

  // Thêm class tương ứng với sơ đồ đang được chọn
  if (sheetName === "BanChanhHanh") {
    container.classList.add("view-bch");
  } else if (sheetName === "ToanThe") {
    container.classList.add("view-toan-the");
  } else if (sheetName === "Tanghoa") {
    // Thêm điều kiện cho Tặng hoa
    container.classList.add("view-tang-hoa");
  }
  // ======================

  // Xử lý nút active
  buttons.forEach((btn) => btn.classList.remove("active"));
  const activeButton = document.querySelector(
    `.controls button[onclick*="'${sheetName}'"]`
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }

  // Phần còn lại của hàm giữ nguyên...
  loader.style.display = "none";
  container.innerHTML = "";
  countElement.textContent = "";

  const cachedDataString = sessionStorage.getItem("soDoChupAnhData");

  if (cachedDataString) {
    const allChupAnhData = JSON.parse(cachedDataString);
    const delegatesForSheet = allChupAnhData[sheetName];

    if (delegatesForSheet) {
      displayDiagram(delegatesForSheet);
    } else {
      container.innerHTML = `<h2>Không tìm thấy dữ liệu cho sơ đồ '${sheetName}'.</h2>`;
    }
  } else {
    container.innerHTML =
      "<h2>Không có dữ liệu. Vui lòng quay lại trang chủ để tải lại.</h2>";
  }
}

// Hàm displayDiagram của bạn đã đúng, giữ nguyên không thay đổi
// Hàm displayDiagram đã được cập nhật để đọc đúng tên cột từ cache
// Hàm displayDiagram đã được cập nhật để đọc đúng tên cột từ cache và xử lý sơ đồ 1 hàng/nhiều hàng
function displayDiagram(delegates) {
  const container = document.getElementById("diagram-container");
  container.innerHTML = "";

  const validDelegates = delegates.filter(
    (delegate) => delegate.Sohang && delegate.Vitri
  );

  // Cập nhật tổng số đại biểu
  const countElement = document.getElementById("delegate-count");
  if (countElement) {
    countElement.textContent = `Tổng số: ${validDelegates.length} đại biểu`;
  }

  // --- PHẦN XỬ LÝ QUAN TRỌNG: XÁC ĐỊNH SỐ LƯỢNG HÀNG ---
  const uniqueRows = [...new Set(validDelegates.map((d) => d.Sohang))].length;

  if (uniqueRows === 1) {
    // --- TRƯỜNG HỢP CHỈ CÓ MỘT HÀNG (VD: TẶNG HOA) ---
    const singleRowDelegates = sortSeatsCenterOut(validDelegates); // Sử dụng hàm sắp xếp

    const singleRowElement = document.createElement("div");
    singleRowElement.className = "row-single-line"; // Class mới cho hàng đơn

    singleRowDelegates.forEach((delegate) => {
      const delegateDiv = document.createElement("div");
      delegateDiv.className = "delegate";
      delegateDiv.setAttribute("tabindex", "0");
      if (delegate.Doituong == "1") {
        // Sửa thành Doituong để khớp với GSheet
        delegateDiv.classList.add("doituong-1");
      } else if (delegate.Doituong == "2") {
        // Sửa thành Doituong để khớp với GSheet
        delegateDiv.classList.add("doituong-2");
      }
      delegateDiv.innerHTML = `
                <div class="position">${delegate.Vitri}</div>
                <div class="name">${delegate.Hoten || ""}</div>
            `;
      singleRowElement.appendChild(delegateDiv);
    });
    container.appendChild(singleRowElement);
  } else {
    // --- TRƯỜNG HỢP CÓ NHIỀU HÀNG (LOGIC HIỆN TẠI CỦA BẠN) ---
    const rows = {};
    validDelegates.forEach((delegate) => {
      const rowNum = delegate.Sohang;
      if (!rows[rowNum]) {
        rows[rowNum] = [];
      }
      rows[rowNum].push({
        name: delegate.Hoten ? delegate.Hoten.trim() : "",
        position: parseInt(delegate.Vitri),
        doituong: delegate.Doituong,
      });
    });

    Object.keys(rows)
      .sort((a, b) => a - b)
      .forEach((rowNum) => {
        const rowData = rows[rowNum];
        const rowElement = document.createElement("div");
        rowElement.className = "row";
        const contentWrapper = document.createElement("div");
        contentWrapper.className = "row-content-wrapper";

        // Sử dụng hàm sắp xếp chung
        const sortedDelegates = sortSeatsCenterOut(
          rowData.map((d) => ({
            Hoten: d.name,
            Vitri: d.position,
            Doituong: d.doituong,
            Sohang: rowNum, // Thêm Sohang để hàm sortSeatsCenterOut hoạt động đúng nếu cần
          }))
        );

        sortedDelegates.forEach((delegate) => {
          const delegateDiv = document.createElement("div");
          delegateDiv.className = "delegate";
          delegateDiv.setAttribute("tabindex", "0");
          if (delegate.Doituong == "1") {
            // Sửa thành Doituong
            delegateDiv.classList.add("doituong-1");
          } else if (delegate.Doituong == "2") {
            // Sửa thành Doituong
            delegateDiv.classList.add("doituong-2");
          }
          delegateDiv.innerHTML = `
                        <div class="position">${delegate.Vitri}</div>
                        <div class="name">${delegate.Hoten || ""}</div>
                    `;
          contentWrapper.appendChild(delegateDiv);
        });

        rowElement.appendChild(contentWrapper);
        const rowLabel = document.createElement("div");
        rowLabel.className = "row-label";
        rowLabel.textContent = `Hàng ${rowNum}`;
        rowElement.appendChild(rowLabel);
        container.appendChild(rowElement);
      });
  }

  // Phần code cuộn ngang vẫn giữ nguyên, nhưng cần được đặt ra ngoài if/else
  setTimeout(() => {
    const diagramContainer = document.getElementById("diagram-container");
    if (diagramContainer) {
      // CHỈ thực hiện đồng bộ chiều rộng và cuộn
      // nếu container KHÔNG CÓ class 'view-tang-hoa'
      if (!diagramContainer.classList.contains("view-tang-hoa")) {
        const allRowWrappers = diagramContainer.querySelectorAll(
          ".row-content-wrapper"
        );
        let maxWidth = 0;
        allRowWrappers.forEach((wrapper) => {
          if (wrapper.scrollWidth > maxWidth) {
            maxWidth = wrapper.scrollWidth;
          }
        });

        if (maxWidth > 0) {
          allRowWrappers.forEach((wrapper) => {
            wrapper.style.width = `${maxWidth}px`;
          });
        }

        const scrollableWidth =
          diagramContainer.scrollWidth - diagramContainer.clientWidth;
        diagramContainer.scrollLeft = scrollableWidth / 2;
      }
    }
  }, 50);
}

/**
 * Hàm mới để sắp xếp các ghế theo kiểu chẵn trái, lẻ phải, số nhỏ ở giữa
 * @param {Array} delegates - Mảng đại biểu của một hàng (dạng {Hoten, Vitri, Doituong, Sohang})
 * @returns {Array} - Mảng đại biểu đã được sắp xếp
 */
function sortSeatsCenterOut(delegates) {
  // Sắp xếp số chẵn GIẢM DẦN (6, 4, 2)
  const evens = delegates
    .filter((d) => d.Vitri % 2 === 0)
    .sort((a, b) => b.Vitri - a.Vitri);

  // Sắp xếp số lẻ TĂNG DẦN (1, 3, 5)
  const odds = delegates
    .filter((d) => d.Vitri % 2 !== 0)
    .sort((a, b) => a.Vitri - b.Vitri);

  // Ghép mảng chẵn vào trước, mảng lẻ vào sau
  return [...evens, ...odds];
}

// Bắt đầu chạy khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");
});
