// THAY THẾ URL NÀY bằng URL Web App bạn đã sao chép ở Bước 2
const webAppUrl =
  "https://script.google.com/macros/s/AKfycbwabxc2-QugM3__9KIO1SNUV2i_-DIzKl48V7Ecab3LfZTiX8q77TIxN8y7g7dJZVC1/exec";

function loadDiagram(sheetName) {
  const container = document.getElementById("diagram-container");
  container.innerHTML = "<h2>Đang tải dữ liệu...</h2>"; // Hiển thị thông báo đang tải

  // Gọi đến URL của Web App, truyền tên sheet vào làm tham số
  fetch(`${webAppUrl}?sheetName=${sheetName}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      displayDiagram(data);
    })
    .catch((error) => {
      console.error("Lỗi:", error);
      container.innerHTML = `<h2>Có lỗi xảy ra: ${error.message}</h2>`;
    });
}

function displayDiagram(delegates) {
  const container = document.getElementById("diagram-container");
  container.innerHTML = ""; // Xóa nội dung cũ

  // Nhóm các đại biểu theo hàng
  const rows = {};
  delegates.forEach((delegate) => {
    const rowNum = delegate.Sohang;
    if (!rowNum || !delegate.Vitri || !delegate.Hoten) return;

    if (!rows[rowNum]) {
      rows[rowNum] = [];
    }
    rows[rowNum].push({
      name: delegate.Hoten.trim(),
      position: parseInt(delegate.Vitri),
    });
  });

  // Sắp xếp các hàng theo số thứ tự và hiển thị
  Object.keys(rows)
    .sort((a, b) => a - b)
    .forEach((rowNum) => {
      const rowData = rows[rowNum];

      const rowElement = document.createElement("div");
      rowElement.className = "row";
      rowElement.innerHTML = `<div class="row-label">Hàng ${rowNum}</div>`;

      // Tách số chẵn và lẻ, sau đó sắp xếp
      const evens = rowData
        .filter((d) => d.position % 2 === 0)
        .sort((a, b) => a.position - b.position);
      const odds = rowData
        .filter((d) => d.position % 2 !== 0)
        .sort((a, b) => b.position - a.position);

      // Ghép lại theo thứ tự: số lẻ giảm dần, số chẵn tăng dần
      const sortedDelegates = [...odds, ...evens];

      // Tạo và thêm các phần tử HTML
      sortedDelegates.forEach((delegate) => {
        const delegateDiv = document.createElement("div");
        delegateDiv.className = "delegate";
        delegateDiv.innerHTML = `
                <div class="position">${delegate.position}</div>
                <div class="name">${delegate.name}</div>
            `;
        rowElement.appendChild(delegateDiv);
      });

      container.appendChild(rowElement);
    });
}

// Tự động tải sơ đồ đầu tiên khi mở trang
document.addEventListener("DOMContentLoaded", () => {
  loadDiagram("BanChanhHanh"); // Tải sheet 'BanChanhHanh' làm mặc định
});
