// SoDoChupAnh/script.js - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG

document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");
});

function loadDiagram(sheetName) {
  const titleElement = document.getElementById("main-title");
  let newTitle = "SƠ ĐỒ VỊ TRÍ CHỤP ẢNH LƯU NIỆM, TẶNG HOA";

  if (sheetName === "BanChanhHanh") {
    newTitle =
      "SƠ ĐỒ ĐỒNG CHÍ ỦY VIÊN BỘ CHÍNH TRỊ CHỤP ẢNH VỚI BCH ĐẢNG BỘ TỈNH";
  } else if (sheetName === "ToanThe") {
    newTitle =
      "SƠ ĐỒ ĐỒNG CHÍ ỦY VIÊN BỘ CHÍNH TRỊ CHỤP ẢNH VỚI ĐẠI BIỂU DỰ ĐẠI HỘI";
  } else if (sheetName === "Tanghoa") {
    newTitle = "SƠ ĐỒ TẶNG HOA"; // Tiêu đề mới cho sơ đồ tặng hoa
  }
  if (titleElement) {
    titleElement.textContent = newTitle;
  }

  const container = document.getElementById("diagram-container");
  const buttons = document.querySelectorAll(".controls button");

  // --- PHẦN QUAN TRỌNG ĐẢM BẢO ĐÚNG TÊN CLASS ---
  container.classList.remove(
    "view-bch",
    "view-toan-the",
    "view-tang-hoa",
    "view-tang-hoa2"
  );

  if (sheetName === "BanChanhHanh") {
    container.classList.add("view-bch"); // Phải là 'view-bch' để khớp với CSS
  } else if (sheetName === "ToanThe") {
    container.classList.add("view-toan-the");
  } else if (sheetName === "BanChanhHanh") {
    container.classList.add("view-bch");
  } else if (sheetName === "Tanghoa") {
    container.classList.add("view-tang-hoa2"); // Giữ lại style của Tặng hoa 2
  }
  // --- KẾT THÚC PHẦN QUAN TRỌNG ---

  buttons.forEach((btn) => btn.classList.remove("active"));
  const activeButton = document.querySelector(
    `.controls button[onclick*="'${sheetName}'"]`
  );
  if (activeButton) activeButton.classList.add("active");

  const cachedDataString = sessionStorage.getItem("soDoChupAnhData");
  if (cachedDataString) {
    const allChupAnhData = JSON.parse(cachedDataString);
    const delegatesForSheet = allChupAnhData[sheetName];

    if (delegatesForSheet) {
      displayDiagram(delegatesForSheet);
      requestAnimationFrame(() => {
        if (container.scrollWidth > container.clientWidth) {
          container.scrollLeft =
            (container.scrollWidth - container.clientWidth) / 2;
        }
      });
    } else {
      container.innerHTML = `<h2>Không tìm thấy dữ liệu cho sơ đồ '${sheetName}'.</h2>`;
    }
  } else {
    container.innerHTML =
      "<h2>Không có dữ liệu. Vui lòng quay lại trang chủ.</h2>";
  }
}
// script.js

function displayDiagram(delegates) {
  const container = document.getElementById("diagram-container");
  const countElement = document.getElementById("delegate-count");

  const validDelegates = delegates.filter((d) => d.Sohang && d.Vitri);
  countElement.textContent = `Tổng số: ${validDelegates.length} đại biểu`;
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const rows = {};
  validDelegates.forEach((delegate) => {
    const rowNum = delegate.Sohang;
    if (!rows[rowNum]) rows[rowNum] = [];
    rows[rowNum].push(delegate);
  });

  // --- THÊM CHÚ THÍCH PHÍA TRÊN ---
  // Áp dụng cho cả sơ đồ Ban Chấp hành và Tặng hoa
  if (
    container.classList.contains("view-bch") ||
    container.classList.contains("view-tang-hoa2")
  ) {
    const topLabel = document.createElement("div");
    topLabel.className = "direction-label";
    topLabel.innerHTML = `<i class="fa-solid fa-angles-up"></i><span>ĐOÀN CHỦ TỊCH</span>`;
    fragment.appendChild(topLabel);
  }

  // Lặp qua từng hàng để vẽ sơ đồ
  Object.keys(rows)
    .sort((a, b) => b - a)
    .forEach((rowNum) => {
      const rowData = rows[rowNum];
      const rowElement = document.createElement("div");
      rowElement.className = "row";
      const contentWrapper = document.createElement("div");
      contentWrapper.className = "row-content-wrapper";

      const evens = rowData
        .filter((d) => d.Vitri % 2 === 0)
        .sort((a, b) => b.Vitri - a.Vitri);
      const odds = rowData
        .filter((d) => d.Vitri % 2 !== 0)
        .sort((a, b) => a.Vitri - b.Vitri);

      const createDelegateElement = (delegate) => {
        const delegateDiv = document.createElement("div");
        delegateDiv.className = "delegate";
        delegateDiv.innerHTML = `
              <div class="position">${delegate.Vitri}</div>
              <div class="name">${delegate.Hoten || ""}</div>
          `;
        return delegateDiv;
      };

      evens.forEach((delegate) =>
        contentWrapper.appendChild(createDelegateElement(delegate))
      );

      // Logic chèn Lẵng hoa (chỉ cho sơ đồ tặng hoa)
      if (
        rowNum == "1" &&
        (container.classList.contains("view-tang-hoa") ||
          container.classList.contains("view-tang-hoa2"))
      ) {
        const flowerDiv = document.createElement("div");
        flowerDiv.className = "flower-basket";
        flowerDiv.textContent = "Lẵng hoa";
        contentWrapper.appendChild(flowerDiv);
      }

      odds.forEach((delegate) =>
        contentWrapper.appendChild(createDelegateElement(delegate))
      );

      rowElement.appendChild(contentWrapper);

      // Chỉ hiển thị nhãn "Hàng X" cho các sơ đồ có nhiều hàng
      if (!container.classList.contains("view-tang-hoa2")) {
        const rowLabel = document.createElement("div");
        rowLabel.className = "row-label";
        rowLabel.textContent = `Hàng ${rowNum}`;
        rowElement.appendChild(rowLabel);
      }

      fragment.appendChild(rowElement);
    });

  // --- THÊM CHÚ THÍCH PHÍA DƯỚI ---
  // Áp dụng cho cả sơ đồ Ban Chấp hành và Tặng hoa
  if (
    container.classList.contains("view-bch") ||
    container.classList.contains("view-tang-hoa2")
  ) {
    const bottomLabel = document.createElement("div");
    bottomLabel.className = "direction-label";
    bottomLabel.innerHTML = `<span>HỘI TRƯỜNG</span><i class="fa-solid fa-angles-down"></i>`;
    fragment.appendChild(bottomLabel);
  }

  container.appendChild(fragment);
}
