import { db, collection, onSnapshot } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- XỬ LÝ ĐĂNG NHẬP ---
  const adminBtn = document.getElementById("admin-icon");
  const loginModal = document.getElementById("login-modal");
  const closeLogin = document.getElementById("close-login");
  const submitLogin = document.getElementById("submit-login");
  const userIn = document.getElementById("username");
  const passIn = document.getElementById("password");
  const errorMsg = document.getElementById("login-error");

  adminBtn.addEventListener("click", () => {
    loginModal.style.display = "flex";
  });
  closeLogin.addEventListener("click", () => {
    loginModal.style.display = "none";
    errorMsg.style.display = "none";
  });

  submitLogin.addEventListener("click", () => {
    if (userIn.value === "admin" && passIn.value === "123456") {
      window.location.href = "admin.html";
    } else {
      errorMsg.style.display = "block";
    }
  });

  // --- DỰNG KHUNG KHÁN PHÒNG (KHÔNG CÓ CHỦ TỌA) ---
  const chairmanContainer = document.getElementById("chairman-container");
  const leftBlock = document.getElementById("left-block");
  const rightBlock = document.getElementById("right-block");

  function buildAuditoriumMap() {
    const TOTAL_ROWS = 11;
    const rowLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

    function buildBlock(container, isLeftBlock) {
      for (let r = 0; r < TOTAL_ROWS; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "auditorium-row";
        const tablesContainer = document.createElement("div");
        tablesContainer.className = "tables-container";
        const numTables = r < 3 ? 4 : 5;
        const seatsInRow = numTables * 2;

        for (let t = 0; t < numTables; t++) {
          const tableGroup = document.createElement("div");
          tableGroup.className = "table-group";
          const chairsRow = document.createElement("div");
          chairsRow.className = "auditorium-chairs";

          for (let c = 0; c < 2; c++) {
            const seat = document.createElement("div");
            seat.className = "seat-3d a-seat";
            const globalSeatIndex = t * 2 + c;
            let seatNum = isLeftBlock
              ? (seatsInRow - globalSeatIndex) * 2 - 1
              : (globalSeatIndex + 1) * 2;
            const seatCode = rowLetters[r] + seatNum;
            seat.dataset.code = seatCode;
            seat.innerHTML = `<span class="seat-code">${seatCode}</span>`;
            chairsRow.appendChild(seat);
          }
          const tableSurface = document.createElement("div");
          tableSurface.className = "auditorium-table";
          tableGroup.appendChild(tableSurface);
          tableGroup.appendChild(chairsRow);
          tablesContainer.appendChild(tableGroup);
        }
        rowDiv.appendChild(tablesContainer);
        container.appendChild(rowDiv);
      }
    }
    buildBlock(leftBlock, true);
    buildBlock(rightBlock, false);
  }

  buildAuditoriumMap();

  // --- LOAD VÀ XỬ LÝ DỮ LIỆU TỪ FIREBASE ---
  const delegatesCol = collection(db, "delegates");
  onSnapshot(delegatesCol, (snapshot) => {
    const delegatesData = [];
    snapshot.forEach((docSnap) => delegatesData.push(docSnap.data()));

    // Reset ghế Khán phòng
    document.querySelectorAll(".a-seat").forEach((seat) => {
      seat.classList.remove("has-delegate");
      seat.removeAttribute("data-tooltip"); // Xóa custom tooltip
      seat.innerHTML = `<span class="seat-code">${seat.dataset.code}</span>`;
    });

    const chairmanDelegates = delegatesData.filter(
      (d) => d.seat && d.seat.toUpperCase().startsWith("V"),
    );
    const audienceDelegates = delegatesData.filter(
      (d) => d.seat && !d.seat.toUpperCase().startsWith("V"),
    );

    // ==========================================
    // XỬ LÝ KHU VỰC CHỦ TỌA
    // ==========================================
    chairmanContainer.innerHTML = "";

    // CẬP NHẬT: Đảo ghế CHẴN sang TRÁI, LẺ sang PHẢI (nhìn từ dưới lên)
    const chairmanOrder = ["V4", "V2", "V1", "V3", "V5"];
    const occupiedVCodes = chairmanDelegates.map((d) => d.seat.toUpperCase());

    const seatsToShow = chairmanOrder.filter((code) =>
      occupiedVCodes.includes(code),
    );

    if (seatsToShow.length > 0) {
      const cGroup = document.createElement("div");
      cGroup.className = "chairman-group";
      cGroup.style.width = `${seatsToShow.length * 130}px`;

      const cChairs = document.createElement("div");
      cChairs.className = "chairman-chairs";
      const cTable = document.createElement("div");
      cTable.className = "chairman-table";

      seatsToShow.forEach((seatCode) => {
        const del = chairmanDelegates.find(
          (d) => d.seat.toUpperCase() === seatCode,
        );
        const slot = document.createElement("div");
        slot.className = "chair-slot";
        const seat = document.createElement("div");
        seat.className = "seat-3d c-seat";

        let shortName = del.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();

        seat.innerHTML = `<span class="seat-code">${seatCode}</span><span class="delegate-name">Đ/c ${shortName}</span>`;

        // Dùng data-tooltip thay cho title mặc định
        seat.setAttribute("data-tooltip", `Đồng chí ${del.name}`);

        slot.appendChild(seat);
        cChairs.appendChild(slot);
        const panel = document.createElement("div");
        panel.className = "table-panel";
        cTable.appendChild(panel);
      });

      cGroup.appendChild(cChairs);
      cGroup.appendChild(cTable);
      chairmanContainer.appendChild(cGroup);
    }

    // ==========================================
    // XỬ LÝ KHU VỰC KHÁN PHÒNG
    // ==========================================
    audienceDelegates.forEach((delegate) => {
      const seatCode = delegate.seat.toUpperCase();
      const seatEl = document.querySelector(`[data-code="${seatCode}"]`);

      if (seatEl) {
        let shortName = delegate.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();

        seatEl.innerHTML = `<span class="seat-code">${seatCode}</span><span class="delegate-name">Đ/c ${shortName}</span>`;
        seatEl.classList.add("has-delegate");

        // Dùng data-tooltip thay cho title mặc định
        seatEl.setAttribute("data-tooltip", `Đồng chí ${delegate.name}`);
      }
    });
  });
  // ==========================================
  // CHỨC NĂNG TÌM KIẾM VỊ TRÍ GHẾ
  // ==========================================
  const searchInput = document.getElementById("search-delegate");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const allSeats = document.querySelectorAll(".seat-3d");

      allSeats.forEach((seat) => {
        const tooltipText = seat.getAttribute("data-tooltip");

        if (
          searchTerm !== "" &&
          tooltipText &&
          tooltipText.toLowerCase().includes(searchTerm)
        ) {
          seat.classList.add("highlight-seat"); // Phát sáng ghế tìm thấy
        } else {
          seat.classList.remove("highlight-seat");
        }
      });
    });
  }
});
