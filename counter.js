// Dán URL Web App bạn vừa sao chép ở Bước 3 vào đây
const counterApiUrl =
  "https://script.google.com/macros/s/AKfycbzwLqqPKtqPe8KhQowNwxHcXq1mMpdh6vUmOhkwLDTLx6MdQU5CWU84UdfkSe8Tw_-5/exec";
(function updateCounter() {
  const countElement = document.getElementById("visitor-count");
  const loaderElement = document.getElementById("counter-loader");

  // Ban đầu, ẩn số và hiện spinner
  if (countElement) countElement.style.display = "none";
  if (loaderElement) loaderElement.style.display = "inline-block";

  fetch(counterApiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.count) {
        if (countElement) {
          countElement.textContent = data.count.toLocaleString("vi-VN");
          countElement.style.display = "inline"; // Hiện số
        }
      }
    })
    .catch((error) => {
      console.error("Không thể tải số lượt truy cập:", error);
      if (countElement) {
        countElement.textContent = "N/A";
        countElement.style.display = "inline"; // Hiện thông báo lỗi
      }
    })
    .finally(() => {
      // Luôn ẩn spinner sau khi hoàn tất (thành công hoặc thất bại)
      if (loaderElement) loaderElement.style.display = "none";
    });
})();
