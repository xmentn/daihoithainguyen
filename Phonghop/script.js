import { db, collection, onSnapshot } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- ĐĂNG NHẬP QUẢN TRỊ (GIỮ NGUYÊN) ---
  const adminBtn = document.getElementById("admin-icon");
  const loginModal = document.getElementById("login-modal");
  const closeLogin = document.getElementById("close-login");
  const submitLogin = document.getElementById("submit-login");

  adminBtn.addEventListener("click", () => {
    loginModal.style.display = "flex";
  });
  closeLogin.addEventListener("click", () => {
    loginModal.style.display = "none";
  });
  submitLogin.addEventListener("click", () => {
    if (
      document.getElementById("username").value === "admin" &&
      document.getElementById("password").value === "123456"
    ) {
      window.location.href = "admin.html";
    } else {
      document.getElementById("login-error").style.display = "block";
    }
  });

  // --- KHÔI PHỤC ĐẦY ĐỦ 11 HÀNG GHẾ HỘI TRƯỜNG (TỪ A ĐẾN K) ---
  const chairmanContainer = document.getElementById("chairman-container");
  const leftBlock = document.getElementById("left-block");
  const rightBlock = document.getElementById("right-block");
  const viewConfSelect = document.getElementById("view-conference-select");
  const headerTitle = document.getElementById("dynamic-header-title");
  const headerSubtitle = document.getElementById("dynamic-header-subtitle");

  function buildAuditoriumMap() {
    const TOTAL_ROWS = 11;
    const rowLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

    function buildBlock(container, isLeftBlock) {
      rowLetters.forEach((letter, r) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "auditorium-row";
        const tablesContainer = document.createElement("div");
        tablesContainer.className = "tables-container";

        // Quy tắc cũ: 3 hàng đầu (A,B,C) có 4 bàn, các hàng sau có 5 bàn
        const numTables = r < 3 ? 4 : 5;
        const seatsInRow = numTables * 2;

        // Thêm nhãn tên Hàng ghế ở đầu hàng bên khối tả (trái)
        if (isLeftBlock) {
          const lbl = document.createElement("span");
          lbl.className = "row-label";
          lbl.textContent = `HÀNG ${letter}`;
          rowDiv.appendChild(lbl);
        }

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
            const seatCode = letter + seatNum;
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
      });
    }
    buildBlock(leftBlock, true);
    buildBlock(rightBlock, false);
  }
  buildAuditoriumMap();

  // --- ĐỒNG BỘ DỮ LIỆU & TỰ ĐỘNG TÍNH TOÁN THỐNG KÊ TOÀN DIỆN ---
  let globalDelegates = {};
  let globalConferences = [];
  let activeConfId = "";

  onSnapshot(collection(db, "delegates"), (snapshot) => {
    globalDelegates = {};
    snapshot.forEach((docSnap) => {
      globalDelegates[docSnap.id] = docSnap.data();
    });
    if (activeConfId) renderActiveConference();
  });

  onSnapshot(collection(db, "conferences"), (snapshot) => {
    globalConferences = [];
    viewConfSelect.innerHTML = "";
    snapshot.forEach((docSnap) => {
      globalConferences.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (globalConferences.length === 0) {
      viewConfSelect.innerHTML = "<option>-- Chưa có hội nghị --</option>";
      return;
    }

    globalConferences.forEach((conf, idx) => {
      const opt = document.createElement("option");
      opt.value = conf.id;
      opt.textContent = conf.name;
      if (activeConfId === "" && idx === 0) {
        activeConfId = conf.id;
        opt.selected = true;
      } else if (conf.id === activeConfId) opt.selected = true;
      viewConfSelect.appendChild(opt);
    });
    renderActiveConference();
  });

  viewConfSelect.addEventListener("change", (e) => {
    activeConfId = e.target.value;
    renderActiveConference();
  });

  function renderActiveConference() {
    const conf = globalConferences.find((c) => c.id === activeConfId);
    if (!conf) return;

    // Đổi tiêu đề Banner đầu trang theo Hội nghị đang chọn
    headerTitle.textContent = conf.name.toUpperCase();
    headerSubtitle.textContent = `Hội trường Tỉnh ủy`;

    // Reset tất cả ghế khán phòng về trạng thái trống ban đầu
    document.querySelectorAll(".a-seat").forEach((seat) => {
      seat.classList.remove("has-delegate");
      seat.removeAttribute("data-tooltip");
      seat.innerHTML = `<span class="seat-code">${seat.dataset.code}</span>`;
    });

    const seatsMap = conf.seats || {};
    let selectedCount = 0;

    const chairmanDelegates = [];
    const audienceDelegates = [];

    Object.keys(seatsMap).forEach((delId) => {
      const delInfo = globalDelegates[delId];
      if (delInfo) {
        const seatCode = seatsMap[delId].toUpperCase();
        const item = { name: delInfo.name, seat: seatCode };
        if (seatCode.startsWith("V")) chairmanDelegates.push(item);
        else audienceDelegates.push(item);
      }
    });

    // 1. ĐỔ GHẾ CHỦ TỌA ĐỘNG (Chẵn Trái - Lẻ Phải)
    chairmanContainer.innerHTML = "";
    const chairmanOrder = ["V4", "V2", "V1", "V3", "V5"];
    const occupiedVCodes = chairmanDelegates.map((d) => d.seat);
    const seatsToShow = chairmanOrder.filter((code) =>
      occupiedVCodes.includes(code),
    );

    if (seatsToShow.length > 0) {
      const cGroup = document.createElement("div");
      cGroup.className = "chairman-group";
      cGroup.style.width = `${seatsToShow.length * 110}px`;
      const cChairs = document.createElement("div");
      cChairs.className = "chairman-chairs";
      const cTable = document.createElement("div");
      cTable.className = "chairman-table";

      seatsToShow.forEach((seatCode) => {
        selectedCount++;
        const del = chairmanDelegates.find((d) => d.seat === seatCode);
        const slot = document.createElement("div");
        slot.className = "chair-slot";
        const seat = document.createElement("div");
        seat.className = "seat-3d c-seat";
        let shortName = del.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();

        seat.innerHTML = `<span class="seat-code">${seatCode}</span><span class="delegate-name">Đ/c ${shortName}</span>`;
        seat.setAttribute("data-tooltip", `Đồng chí\n${del.name}`);
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

    // 2. ĐỔ GHẾ KHÁN PHÒNG TỔNG HỢP
    audienceDelegates.forEach((del) => {
      const seatEl = document.querySelector(`[data-code="${del.seat}"]`);
      if (seatEl) {
        selectedCount++;
        let shortName = del.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();
        seatEl.innerHTML = `<span class="seat-code">${del.seat}</span><span class="delegate-name">Đ/c ${shortName}</span>`;
        seatEl.classList.add("has-delegate");
        seatEl.setAttribute("data-tooltip", `Đồng chí\n${del.name}`);
      }
    });

    // ==========================================
    // TỰ ĐỘNG CẬP NHẬT CHỈ SỐ THỐNG KÊ THEO QUY MÔ THẬT
    // ==========================================
    const totalChairsCount =
      document.querySelectorAll(".a-seat").length + seatsToShow.length;
    const emptyCount = totalChairsCount - selectedCount;
    const percent =
      totalChairsCount > 0
        ? ((selectedCount / totalChairsCount) * 100).toFixed(1)
        : 0;

    document.getElementById("stat-total").textContent = totalChairsCount;
    document.getElementById("stat-selected").textContent = selectedCount;
    document.getElementById("stat-empty").textContent = emptyCount;
    document.getElementById("stat-percent").textContent = `${percent}%`;
  }

  // --- TÌM KIẾM ĐẠI BIỂU ---
  const searchInput = document.getElementById("search-delegate");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".seat-3d").forEach((seat) => {
        const tooltipText = seat.getAttribute("data-tooltip");
        if (
          searchTerm !== "" &&
          tooltipText &&
          tooltipText.toLowerCase().includes(searchTerm)
        ) {
          seat.classList.add("highlight-seat");
        } else {
          seat.boxShadow = "";
          seat.classList.remove("highlight-seat");
        }
      });
    });
  }

  document.getElementById("btn-refresh-page")?.addEventListener("click", () => {
    window.location.reload();
  });
});
