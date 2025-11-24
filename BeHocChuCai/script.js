// Lấy thẻ audio
const audioClap = document.getElementById("clapping-audio");

// Hàm chuyển đổi màn hình
function showScreen(screenId) {
  // Ẩn tất cả màn hình
  document
    .querySelectorAll(".screen")
    .forEach((div) => div.classList.remove("active"));
  // Hiện màn hình mong muốn
  document.getElementById(screenId).classList.add("active");

  // Dừng âm thanh nếu đang phát (đề phòng trường hợp chuyển màn hình nhanh)
  stopAudio();
}

// Bắt đầu game
function startGame() {
  showScreen("game-screen");
}

// Kiểm tra bé bấm vào chữ gì
function checkAnswer(letter) {
  if (letter === "ô") {
    // --- TRƯỜNG HỢP ĐÚNG ---
    showScreen("success-screen");

    // 1. Phát âm thanh vỗ tay
    playSuccessSound();

    // 2. Bắn pháo hoa giấy
    triggerFireworks();
  } else {
    // --- TRƯỜNG HỢP SAI ---
    // Nếu sai (n, g, i, ộ...)
    showScreen("fail-screen");
  }
}

// Cho bé thử lại khi sai (quay về màn hình game)
function retryGame() {
  showScreen("game-screen");
}

// --- HÀM HỖ TRỢ ÂM THANH & HIỆU ỨNG ---

function playSuccessSound() {
  // Đặt thời gian về 0 để phát lại từ đầu mỗi lần thắng
  audioClap.currentTime = 0;
  // Phát âm thanh
  audioClap.play().catch((error) => {
    console.log(
      "Trình duyệt chặn tự động phát âm thanh. Người dùng cần tương tác trước."
    );
  });
}

function stopAudio() {
  audioClap.pause();
  audioClap.currentTime = 0;
}

// Hàm tạo hiệu ứng pháo hoa giấy (Sử dụng thư viện canvas-confetti)
function triggerFireworks() {
  var duration = 3 * 1000; // Kéo dài 3 giây
  var animationEnd = Date.now() + duration;
  var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  var interval = setInterval(function () {
    var timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    var particleCount = 50 * (timeLeft / duration);
    // Bắn pháo hoa từ 2 bên góc dưới
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    );
  }, 250);
}
