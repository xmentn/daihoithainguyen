function loadDiagram(sheetName) {
  const container = document.getElementById("diagram-container");
  const countElement = document.getElementById("delegate-count");
  const loader = document.getElementById("loader");
  const buttons = document.querySelectorAll(".controls button");

  // === PHẦN QUAN TRỌNG: THÊM CLASS ĐỂ ĐIỀU KHIỂN KÍCH THƯỚC ===
  // Xóa các class của lần xem trước
  container.classList.remove("view-bch", "view-toan-the");

  // Thêm class tương ứng với sơ đồ đang được chọn
  if (sheetName === "BanChanhHanh") {
    container.classList.add("view-bch");
  } else if (sheetName === "ToanThe") {
    container.classList.add("view-toan-the");
  }
  // ==========================================================

  // Xử lý nút active
  buttons.forEach((btn) => btn.classList.remove("active"));
  const activeButton = document.querySelector(
    `.controls button[onclick*="'${sheetName}'"]`
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }

  // Ẩn spinner và xóa nội dung cũ
  loader.style.display = "none";
  container.innerHTML = "";
  countElement.textContent = "";

  // Đọc dữ liệu từ cache trình duyệt
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
function displayDiagram(delegates) {
  const container = document.getElementById("diagram-container");
  container.innerHTML = "";

  const rows = {};
  // Lọc ra các đại biểu có đủ thông tin Sohang và Vitri
  const validDelegates = delegates.filter(
    (delegate) => delegate.Sohang && delegate.Vitri
  );

  validDelegates.forEach((delegate) => {
    const rowNum = delegate.Sohang; // Đọc đúng tên cột "Sohang"
    if (!rows[rowNum]) {
      rows[rowNum] = [];
    }
    rows[rowNum].push({
      name: delegate.Hoten ? delegate.Hoten.trim() : "",
      position: parseInt(delegate.Vitri), // Đọc đúng tên cột "Vitri"
      doituong: delegate.Doituong,
    });
  });

  // Phần code còn lại của hàm giữ nguyên không thay đổi...
  Object.keys(rows)
    .sort((a, b) => a - b)
    .forEach((rowNum) => {
      const rowData = rows[rowNum];
      const rowElement = document.createElement("div");
      rowElement.className = "row";
      const contentWrapper = document.createElement("div");
      contentWrapper.className = "row-content-wrapper";

      const evens = rowData
        .filter((d) => d.position % 2 === 0)
        .sort((a, b) => a.position - b.position);
      const odds = rowData
        .filter((d) => d.position % 2 !== 0)
        .sort((a, b) => b.position - a.position);
      const sortedDelegates = [...odds, ...evens];

      sortedDelegates.forEach((delegate) => {
        const delegateDiv = document.createElement("div");
        delegateDiv.className = "delegate";
        delegateDiv.setAttribute("tabindex", "0");
        if (delegate.doituong == "1") {
          delegateDiv.classList.add("doituong-1");
        } else if (delegate.doituong == "2") {
          delegateDiv.classList.add("doituong-2");
        }
        delegateDiv.innerHTML = `
                    <div class="position">${delegate.position}</div>
                    <div class="name">${delegate.name}</div>
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

  const countElement = document.getElementById("delegate-count");
  if (countElement) {
    countElement.textContent = `Tổng số: ${validDelegates.length} đại biểu`;
  }

  setTimeout(() => {
    const diagramContainer = document.getElementById("diagram-container");
    if (diagramContainer) {
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
  }, 50);
}

// Bắt đầu chạy khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");
});
