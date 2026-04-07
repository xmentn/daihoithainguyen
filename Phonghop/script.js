// DÁN LINK CSV CỦA GOOGLE SHEET VÀO ĐÂY (Xem hướng dẫn bên dưới để lấy link)
const sheetCSVUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTurnlLoJd0CMT1d2I5DlnRCK2hZC2vG4ew3FNTVQLqw-9MXJFZCanZMxQm6Pk4etFzu7wMhp6wQPw1/pub?gid=0&single=true&output=csv";
const getSeatNumber = (pos) => parseInt(pos.replace(/[^\d]/g, ""));

// Hàm tự động tải dữ liệu từ Google Sheet
async function loadSheetData() {
  try {
    // Nếu bạn chưa thay link thực tế, code sẽ chạy dữ liệu mẫu này để test
    if (sheetCSVUrl.includes("2PACX-1vQ...")) {
      console.log(
        "Đang chạy dữ liệu mẫu. Hãy thay link CSV để dùng dữ liệu thật.",
      );
      renderMeetingRoom([
        { stt: 1, name: "Trịnh Xuân Trường", position: "CT1" },
        { stt: 2, name: "Vương Quốc Tuấn", position: "CT2" },
        { stt: 3, name: "Nguyễn Đăng Bình", position: "T1" },
        { stt: 4, name: "Đinh Quang Tuyên", position: "P1" },
        { stt: 5, name: "Bùi Văn Lượng", position: "T2" },
        { stt: 6, name: "Dương Văn Tiến", position: "P2" },
      ]);
      return;
    }

    const response = await fetch(sheetCSVUrl);
    const csvText = await response.text();
    const data = parseCSV(csvText);
    renderMeetingRoom(data);
  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);
  }
}

// Hàm phân tích định dạng file CSV
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (cols.length >= 3) {
      data.push({
        stt: cols[0].replace(/"/g, "").trim(),
        name: cols[1].replace(/"/g, "").trim(),
        position: cols[2].replace(/"/g, "").trim(),
      });
    }
  }
  return data;
}

// Hàm vẽ Sơ đồ phòng họp và Nạp danh sách tìm kiếm
function renderMeetingRoom(data) {
  // 1. SẮP XẾP CHỦ TỌA (CT)
  const allCT = data
    .filter((d) => d.position.startsWith("CT"))
    .sort((a, b) => getSeatNumber(a.position) - getSeatNumber(b.position));
  let topSeats = [];
  allCT.forEach((delegate) => {
    const num = getSeatNumber(delegate.position);
    if (num === 1) {
      topSeats.push(delegate); // CT1 ở giữa
    } else if (num % 2 === 0) {
      topSeats.unshift(delegate); // CT chẵn (2,4) ở bên trái màn hình (tay phải chủ tọa)
    } else {
      topSeats.push(delegate); // CT lẻ (3,5) ở bên phải màn hình (tay trái chủ tọa)
    }
  });

  // 2. SẮP XẾP 2 CÁNH (T và P)
  // Tay phải chủ tọa (P) sẽ hiển thị ở cột bên Trái màn hình
  const leftSeats = data
    .filter((d) => d.position.startsWith("P"))
    .sort((a, b) => getSeatNumber(a.position) - getSeatNumber(b.position));
  // Tay trái chủ tọa (T) sẽ hiển thị ở cột bên Phải màn hình
  const rightSeats = data
    .filter((d) => d.position.startsWith("T"))
    .sort((a, b) => getSeatNumber(a.position) - getSeatNumber(b.position));

  const topContainer = document.getElementById("top-row");
  const leftContainer = document.getElementById("left-col");
  const rightContainer = document.getElementById("right-col");

  topContainer.innerHTML = "";
  leftContainer.innerHTML = "";
  rightContainer.innerHTML = "";

  // HTML cho mỗi chỗ ngồi (Đã đổi thành "Đồng chí" và Tooltip 2 dòng)
  const createSeatHTML = (delegate, typeClass) => `
        <div class="seat-wrapper ${typeClass}" data-name="${delegate.name.toLowerCase()}">
            <div class="tooltip">Đồng chí<br>${delegate.name}</div>
            <div class="chair"></div>
            <div class="desk">
                <div class="nameplate">
                    <div class="position-tag">Đồng chí</div>
                    <div class="delegate-name">${delegate.name}</div>
                </div>
            </div>
        </div>
    `;

  // Render ra màn hình
  topSeats.forEach(
    (delegate) =>
      (topContainer.innerHTML += createSeatHTML(delegate, "top-seat")),
  );
  leftSeats.forEach(
    (delegate) =>
      (leftContainer.innerHTML += createSeatHTML(delegate, "left-seat")),
  );
  rightSeats.forEach(
    (delegate) =>
      (rightContainer.innerHTML += createSeatHTML(delegate, "right-seat")),
  );

  // 3. NẠP DANH SÁCH VÀO THANH TÌM KIẾM Ở TRÊN CÙNG
  const datalist = document.getElementById("delegateList");
  if (datalist) {
    datalist.innerHTML = "";
    // Sắp xếp tên đại biểu theo vần A-Z để dễ chọn
    const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

    sortedData.forEach((delegate) => {
      datalist.innerHTML += `<option value="${delegate.name}">`;
    });
  }
}

// === TÍNH NĂNG TÌM KIẾM TRỰC TIẾP ===
// Hàm này được gọi mỗi khi bạn gõ chữ hoặc chọn tên từ danh sách
// === TÍNH NĂNG TÌM KIẾM TRỰC TIẾP TỪ DROPDOWN ===
function selectDelegateFromDropdown() {
  const searchInput = document.getElementById("delegateSearch");
  const searchVal = searchInput.value.toLowerCase().trim();

  // Tắt các hiệu ứng ghế nhấp nháy cũ (nếu có)
  document
    .querySelectorAll(".highlight-seat")
    .forEach((el) => el.classList.remove("highlight-seat"));

  if (!searchVal) return;

  let found = false;
  const seats = document.querySelectorAll(".seat-wrapper");

  seats.forEach((seat) => {
    const delegateName = seat.getAttribute("data-name");

    // Nếu tên trên ghế khớp chính xác hoặc gõ chứa một phần tên
    if (delegateName === searchVal || delegateName.includes(searchVal)) {
      seat.classList.add("highlight-seat"); // Phát sáng chiếc bàn

      // Kéo màn hình mượt mà đến vị trí chiếc bàn đó
      seat.scrollIntoView({ behavior: "smooth", block: "center" });
      found = true;
    }
  });

  // NÂNG CẤP: Tự động xóa chữ và cất bàn phím sau khi chọn xong
  if (found) {
    searchInput.value = ""; // Dọn sạch ô tìm kiếm để lần sau hiện đủ danh sách
    searchInput.blur(); // Ẩn bàn phím trên điện thoại/iPad cho đỡ vướng màn hình
  }
}

// Chạy hàm khởi tạo ứng dụng
loadSheetData();
