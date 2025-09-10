// SoDoChupAnh/script.js - PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG

document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh");
});

function loadDiagram(sheetName) {
  const container = document.getElementById("diagram-container");
  const buttons = document.querySelectorAll(".controls button");

  container.classList.remove("view-bch", "view-toan-the", "view-tang-hoa");
  if (sheetName === "BanChanhHanh") container.classList.add("view-bch");
  else if (sheetName === "ToanThe") container.classList.add("view-toan-the");
  else if (sheetName === "Tanghoa") container.classList.add("view-tang-hoa");

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
      const sortedDelegates = [...evens, ...odds];

      sortedDelegates.forEach((delegate) => {
        const delegateDiv = document.createElement("div");
        delegateDiv.className = "delegate";
        if (delegate.Doituong == "1") delegateDiv.classList.add("doituong-1");
        if (delegate.Doituong == "2") delegateDiv.classList.add("doituong-2");
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

      fragment.appendChild(rowElement);
    });

  container.appendChild(fragment);
}
