const audioClap = document.getElementById("clapping-audio");

function showScreen(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((div) => div.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  stopAudio();
}

function startGame() {
  showScreen("game-screen");
}

function checkAnswer(letter) {
  // SỬA LOGIC Ở ĐÂY:
  // Chấp nhận đúng nếu là chữ 'ô' HOẶC chữ 'ộ'
  if (letter === "ô" || letter === "ộ") {
    // --- ĐÚNG ---
    showScreen("success-screen");
    playSuccessSound();
    triggerFireworks();
  } else {
    // --- SAI (các chữ n, g, i...) ---
    showScreen("fail-screen");
  }
}

function retryGame() {
  showScreen("game-screen");
}

function playSuccessSound() {
  audioClap.currentTime = 0;
  audioClap.play().catch((e) => console.log("Cần tương tác để phát âm thanh"));
}

function stopAudio() {
  audioClap.pause();
  audioClap.currentTime = 0;
}

// Hiệu ứng pháo hoa
function triggerFireworks() {
  var duration = 3 * 1000;
  var animationEnd = Date.now() + duration;
  var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  var interval = setInterval(function () {
    var timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    var particleCount = 50 * (timeLeft / duration);
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
