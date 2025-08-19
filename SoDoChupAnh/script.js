// THAY THẾ URL NÀY bằng URL Web App của bạn
const webAppUrl =
  "https://script.google.com/macros/s/AKfycbwabxc2-QugM3__9KIO1SNUV2i_-DIzKl48V7Ecab3LfZTiX8q77TIxN8y7g7dJZVC1/exec";

// Trong file script.js
function loadDiagram(sheetName) {
  const container = document.getElementById("diagram-container");
  const countElement = document.getElementById("delegate-count");
  const loader = document.getElementById("loader");

  // ================================================================
  // PHẦN QUAN TRỌNG: Thêm class để điều khiển CSS
  // Xóa các class của lần xem trước để tránh bị chồng chéo style
  container.classList.remove("view-bch", "view-toan-the");

  // Thêm class tương ứng với sơ đồ đang được chọn
  if (sheetName === "BanChanhHanh") {
    container.classList.add("view-bch");
  } else if (sheetName === "ToanThe") {
    container.classList.add("view-toan-the");
  }
  // ================================================================

  // Xóa nội dung cũ và hiển thị spinner
  container.innerHTML = "";
  countElement.textContent = "";
  loader.style.display = "block";

  // Xóa class 'active' khỏi tất cả các nút
  const buttons = document.querySelectorAll(".controls button");
  buttons.forEach((btn) => btn.classList.remove("active"));
  const activeButton = document.querySelector(
    `.controls button[onclick*="'${sheetName}'"]`
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }

  fetch(`${webAppUrl}?sheetName=${sheetName}`)
    .then((response) => response.json())
    .then((data) => {
      loader.style.display = "none"; // Ẩn spinner khi có dữ liệu
      if (data.error) {
        throw new Error(data.error);
      }
      displayDiagram(data);
    })
    .catch((error) => {
      loader.style.display = "none"; // Ẩn spinner khi có lỗi
      console.error("Lỗi:", error);
      container.innerHTML = `<h2>Có lỗi xảy ra: ${error.message}</h2>`;
    });
}
function displayDiagram(delegates) {
  const container = document.getElementById("diagram-container");
  container.innerHTML = "";

  const rows = {};
  // Lọc ra các đại biểu có đủ thông tin Sohang và Vitri
  const validDelegates = delegates.filter(
    (delegate) => delegate.Sohang && delegate.Vitri
  );

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

  // ================================================================
  // PHẦN THÊM MỚI: HIỂN THỊ TỔNG SỐ ĐẠI BIỂU
  // ================================================================
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

document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");
});
