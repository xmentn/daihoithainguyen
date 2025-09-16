// SoDoChupAnh/script.js - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG

document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");
});

function loadDiagram(sheetName) {
  const titleElement = document.getElementById("main-title");
  let newTitle = "SƠ ĐỒ VỊ TRÍ CHỤP ẢNH LƯU NIỆM, TẶNG HOA";

  if (sheetName === "Tanghoa1") {
    newTitle = "ĐỒNG CHÍ ỦY VIÊN BỘ CHÍNH TRỊ TẶNG HOA ĐẠI HỘI";
  } else if (sheetName === "Tanghoa2") {
    newTitle = "ĐỒNG CHÍ ỦY VIÊN BỘ CHÍNH TRỊ TẶNG HOA ĐẠI HỘI";
  } else if (sheetName === "BanChanhHanh") {
    newTitle =
      "SƠ ĐỒ ĐỒNG CHÍ ỦY VIÊN BỘ CHÍNH TRỊ CHỤP ẢNH VỚI BCH ĐẢNG BỘ TỈNH";
  } else if (sheetName === "ToanThe") {
    newTitle =
      "SƠ ĐỒ ĐỒNG CHÍ ỦY VIÊN BỘ CHÍNH TRỊ CHỤP ẢNH VỚI ĐẠI BIỂU DỰ ĐẠI HỘI";
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
  } else if (sheetName === "Tanghoa1") {
    container.classList.add("view-tang-hoa");
  } else if (sheetName === "Tanghoa2") {
    container.classList.add("view-tang-hoa2");
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
  // 1. Lấy các phần tử cần thiết và xóa nội dung cũ của sơ đồ
  const container = document.getElementById("diagram-container");
  const countElement = document.getElementById("delegate-count");
  container.innerHTML = ""; // Xóa sơ đồ cũ để vẽ lại

  // 2. Lọc và đếm số đại biểu hợp lệ
  const validDelegates = delegates.filter((d) => d.Sohang && d.Vitri);
  countElement.textContent = `Tổng số: ${validDelegates.length} đại biểu`;

  // 3. Nhóm các đại biểu theo từng hàng
  const fragment = document.createDocumentFragment();
  const rows = {};
  validDelegates.forEach((delegate) => {
    const rowNum = delegate.Sohang;
    if (!rows[rowNum]) rows[rowNum] = [];
    rows[rowNum].push(delegate);
  });

  // 4. Lặp qua từng hàng để vẽ sơ đồ
  Object.keys(rows)
    .sort((a, b) => b - a)
    .forEach((rowNum) => {
      const rowData = rows[rowNum];
      const rowElement = document.createElement("div");
      rowElement.className = "row";

      const contentWrapper = document.createElement("div");
      contentWrapper.className = "row-content-wrapper";

      // Sắp xếp đại biểu chẵn giảm dần, lẻ tăng dần
      const evens = rowData
        .filter((d) => d.Vitri % 2 === 0)
        .sort((a, b) => b.Vitri - a.Vitri);
      const odds = rowData
        .filter((d) => d.Vitri % 2 !== 0)
        .sort((a, b) => a.Vitri - b.Vitri);

      // Hàm trợ giúp tạo phần tử đại biểu
      const createDelegateElement = (delegate) => {
        const delegateDiv = document.createElement("div");
        delegateDiv.className = "delegate";
        delegateDiv.innerHTML = `
        <div class="position">${delegate.Vitri}</div>
        <div class="name">${delegate.Hoten || ""}</div>
    `;
        return delegateDiv;
      };

      // Thêm các đại biểu số chẵn
      evens.forEach((delegate) => {
        contentWrapper.appendChild(createDelegateElement(delegate));
      });

      // === ĐÂY LÀ VỊ TRÍ ĐÚNG ĐỂ CHÈN LẴNG HOA ===
      // Nếu là Hàng 1 và đang ở chế độ xem "Tặng hoa", thì chèn lẵng hoa
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

      // Thêm các đại biểu số lẻ
      odds.forEach((delegate) => {
        contentWrapper.appendChild(createDelegateElement(delegate));
      });

      rowElement.appendChild(contentWrapper);

      const rowLabel = document.createElement("div");
      rowLabel.className = "row-label";
      rowLabel.textContent = `Hàng ${rowNum}`;
      rowElement.appendChild(rowLabel);

      fragment.appendChild(rowElement);
    });

  // 5. Thêm sơ đồ đã hoàn chỉnh vào trang web
  container.appendChild(fragment);
}
