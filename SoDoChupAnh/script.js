// SoDoChupAnh/script.js - PHIÊN BẢN KẾT HỢP HOÀN CHỈNH (ĐÃ SỬA LỖI RESET)

let isPresidiumView = false;
let currentDelegatesData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");

  const toggleBtn = document.getElementById("toggle-view-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isPresidiumView = !isPresidiumView;
      displayDiagram(currentDelegatesData);
    });
  }
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
    newTitle = "SƠ ĐỒ TẶNG HOA";
  }
  if (titleElement) {
    titleElement.textContent = newTitle;
  }

  const container = document.getElementById("diagram-container");
  const buttons = document.querySelectorAll(".controls button");
  const toggleBtn = document.getElementById("toggle-view-btn");

  // DÒNG MÃ GÂY LỖI `isPresidiumView = false;` ĐÃ ĐƯỢC XÓA BỎ HOÀN TOÀN

  if (toggleBtn) {
    if (sheetName === "BanChanhHanh" || sheetName === "Tanghoa") {
      toggleBtn.style.display = "flex";
    } else {
      toggleBtn.style.display = "none";
    }
  }

  container.classList.remove(
    "view-bch",
    "view-toan-the",
    "view-tang-hoa",
    "view-tang-hoa2"
  );

  if (sheetName === "BanChanhHanh") container.classList.add("view-bch");
  else if (sheetName === "ToanThe") container.classList.add("view-toan-the");
  else if (sheetName === "Tanghoa") container.classList.add("view-tang-hoa2");

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
      currentDelegatesData = delegatesForSheet;
      // Vẽ lại sơ đồ với trạng thái xoay hiện tại
      displayDiagram(currentDelegatesData);

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

function displayDiagram(delegates) {
  if (!delegates) return;

  const container = document.getElementById("diagram-container");
  const countElement = document.getElementById("delegate-count");

  // Áp dụng lớp CSS để xoay layout
  if (isPresidiumView) {
    container.classList.add("presidium-view");
  } else {
    container.classList.remove("presidium-view");
  }

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

  // LOGIC KẾT HỢP CHO NHÃN VÀ MŨI TÊN
  let topLabelContent, bottomLabelContent;

  if (isPresidiumView) {
    topLabelContent = `<i class="fa-solid fa-angles-up"></i><span>HỘI TRƯỜỜNG</span>`;
    bottomLabelContent = `<i class="fa-solid fa-angles-up"></i><span>ĐOÀN CHỦ TỊCH</span>`;
  } else {
    topLabelContent = `<i class="fa-solid fa-angles-up"></i><span>ĐOÀN CHỦ TỊCH</span>`;
    bottomLabelContent = `<span>HỘI TRƯỜNG</span><i class="fa-solid fa-angles-down"></i>`;
  }

  if (
    container.classList.contains("view-bch") ||
    container.classList.contains("view-tang-hoa2")
  ) {
    const topLabel = document.createElement("div");
    topLabel.className = "direction-label";
    topLabel.innerHTML = topLabelContent;
    fragment.appendChild(topLabel);
  }

  Object.keys(rows)
    .sort((a, b) => b - a)
    .forEach((rowNum) => {
      const rowData = rows[rowNum];
      const rowElement = document.createElement("div");
      rowElement.className = "row";
      const contentWrapper = document.createElement("div");
      contentWrapper.className = "row-content-wrapper";

      const createDelegateElement = (delegate) => {
        const delegateDiv = document.createElement("div");
        delegateDiv.className = "delegate";
        delegateDiv.innerHTML = `<div class="position">${
          delegate.Vitri
        }</div><div class="name">${delegate.Hoten || ""}</div>`;
        return delegateDiv;
      };

      // --- BẮT ĐẦU VÙNG SỬA ĐỔI SẮP XẾP VÀ LẴNG HOA ---
      let sortedDelegates;

      // KIỂM TRA: Nếu là sơ đồ BCH và là Hàng 1 thì áp dụng logic sắp xếp mới
      if (rowNum == "1" && container.classList.contains("view-bch")) {
        const odds = rowData
          .filter((d) => d.Vitri % 2 !== 0)
          .sort((a, b) => a.Vitri - b.Vitri);
        const evens = rowData
          .filter((d) => d.Vitri % 2 === 0)
          .sort((a, b) => a.Vitri - b.Vitri);
        sortedDelegates = [...odds.reverse(), ...evens];
      } else {
        // Logic cũ: Giữ nguyên cho các hàng và sơ đồ khác
        sortedDelegates = rowData.sort((a, b) => b.Vitri - a.Vitri);
      }

      const delegateElements = sortedDelegates.map(createDelegateElement);

      // SỬA LỖI VỊ TRÍ LẴNG HOA
      if (rowNum == "1" && container.classList.contains("view-tang-hoa2")) {
        const flowerDiv = document.createElement("div");
        flowerDiv.className = "flower-basket";
        flowerDiv.textContent = "Lẵng hoa";

        // Tìm vị trí của đại biểu số 2 để chèn lẵng hoa vào trước
        const insertionIndex = sortedDelegates.findIndex((d) => d.Vitri == 2);

        if (insertionIndex !== -1) {
          // Chèn vào giữa vị trí 3 và 2
          delegateElements.splice(insertionIndex, 0, flowerDiv);
        } else {
          // Nếu không tìm thấy vị trí số 2, chèn vào giữa
          const middleIndex = Math.floor(delegateElements.length / 2);
          delegateElements.splice(middleIndex, 0, flowerDiv);
        }
      }
      // --- KẾT THÚC VÙNG SỬA ĐỔI ---

      delegateElements.forEach((el) => contentWrapper.appendChild(el));
      rowElement.appendChild(contentWrapper);

      if (!container.classList.contains("view-tang-hoa2")) {
        const rowLabel = document.createElement("div");
        rowLabel.className = "row-label";
        rowLabel.textContent = `Hàng ${rowNum}`;
        rowElement.appendChild(rowLabel);
      }
      fragment.appendChild(rowElement);
    });

  if (
    container.classList.contains("view-bch") ||
    container.classList.contains("view-tang-hoa2")
  ) {
    const bottomLabel = document.createElement("div");
    bottomLabel.className = "direction-label";
    bottomLabel.innerHTML = bottomLabelContent;
    fragment.appendChild(bottomLabel);
  }

  container.appendChild(fragment);
}
