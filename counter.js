// Dán URL Web App bạn vừa sao chép ở Bước 3 vào đây
const counterApiUrl =
  "https://script.google.com/macros/s/AKfycbzwLqqPKtqPe8KhQowNwxHcXq1mMpdh6vUmOhkwLDTLx6MdQU5CWU84UdfkSe8Tw_-5/exec";

// Hàm này sẽ tự động chạy khi trang được tải
(function updateCounter() {
  fetch(counterApiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.count) {
        // Lấy phần tử span và cập nhật số đếm
        const countElement = document.getElementById("visitor-count");
        if (countElement) {
          countElement.textContent = data.count.toLocaleString("vi-VN");
        }
      }
    })
    .catch((error) => {
      console.error("Không thể tải số lượt truy cập:", error);
      const countElement = document.getElementById("visitor-count");
      if (countElement) {
        countElement.textContent = "N/A"; // Hiển thị nếu có lỗi
      }
    });
})();
