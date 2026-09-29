import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  onSnapshot,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "./firebase-config.js";

async function getAdminProfile(user) {
  if (!user) return null;

  try {
    const adminSnap = await getDoc(doc(db, "admins", user.uid));

    if (!adminSnap.exists()) return null;

    const adminData = adminSnap.data();
    if (adminData.active !== true) return null;

    return {
      uid: user.uid,
      name: String(adminData.name || "").trim() || "Quản trị viên",
    };
  } catch (error) {
    console.error("Lỗi kiểm tra quyền quản trị:", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // --- ĐĂNG NHẬP & HIỂN THỊ TÀI KHOẢN QUẢN TRỊ ---
  const adminBtn = document.getElementById("admin-icon");
  const adminAccount = document.getElementById("admin-account");
  const goAdminBtn = document.getElementById("go-admin-btn");
  const homeLogoutBtn = document.getElementById("home-logout-btn");
  const loginModal = document.getElementById("login-modal");
  const closeLogin = document.getElementById("close-login");
  const submitLogin = document.getElementById("submit-login");
  const userIn = document.getElementById("username");
  const passIn = document.getElementById("password");
  const errorMsg = document.getElementById("login-error");

  let currentAdminUser = null;
  let currentAdminProfile = null;
  let authInitialized = false;
  let resolveAuthReady;

  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve;
  });

  function renderAdminAccount() {
    if (!adminBtn || !adminAccount) return;

    if (currentAdminUser && currentAdminProfile) {
      adminBtn.textContent = `👤 ${currentAdminProfile.name} ▾`;
      adminAccount.classList.add("is-logged-in");
      adminBtn.setAttribute("aria-label", `Tài khoản ${currentAdminProfile.name}`);
    } else {
      adminBtn.textContent = "🔐 Đăng nhập";
      adminAccount.classList.remove("is-logged-in");
      adminBtn.setAttribute("aria-label", "Đăng nhập quản trị");
    }
  }

  onAuthStateChanged(auth, async (user) => {
    currentAdminUser = null;
    currentAdminProfile = null;

    if (user) {
      const adminProfile = await getAdminProfile(user);

      if (adminProfile) {
        currentAdminUser = user;
        currentAdminProfile = adminProfile;
      } else {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Lỗi đăng xuất tài khoản không có quyền:", error);
        }
      }
    }

    renderAdminAccount();

    if (!authInitialized) {
      authInitialized = true;
      resolveAuthReady(currentAdminUser);
    }
  });

  if (adminBtn) {
    adminBtn.addEventListener("click", async () => {
      if (!authInitialized) {
        await authReadyPromise;
      }

      // Khi đã đăng nhập, dropdown được mở bằng hover/focus từ CSS.
      if (currentAdminUser && currentAdminProfile) return;

      if (loginModal) {
        loginModal.style.display = "flex";
        errorMsg.style.display = "none";
        setTimeout(() => userIn?.focus(), 0);
      }
    });
  }

  if (goAdminBtn) {
    goAdminBtn.addEventListener("click", () => {
      if (currentAdminUser && currentAdminProfile) {
        window.location.href = "admin.html";
      }
    });
  }

  if (homeLogoutBtn) {
    homeLogoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        currentAdminUser = null;
        currentAdminProfile = null;
        renderAdminAccount();
      } catch (error) {
        console.error("Lỗi đăng xuất Firebase:", error);
      }
    });
  }

  if (closeLogin) {
    closeLogin.addEventListener("click", () => {
      loginModal.style.display = "none";
      errorMsg.style.display = "none";
    });
  }

  async function handleAdminLogin() {
    const email = userIn.value.trim();
    const password = passIn.value;

    errorMsg.style.display = "none";

    if (!email || !password) {
      errorMsg.textContent = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
      errorMsg.style.display = "block";
      return;
    }

    submitLogin.textContent = "Đang xác thực...";
    submitLogin.disabled = true;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const adminProfile = await getAdminProfile(userCredential.user);

      if (!adminProfile) {
        await signOut(auth);
        errorMsg.textContent = "Tài khoản này không có quyền quản trị hệ thống!";
        errorMsg.style.display = "block";
        return;
      }

      currentAdminUser = userCredential.user;
      currentAdminProfile = adminProfile;
      renderAdminAccount();

      submitLogin.style.backgroundColor = "#2ecc71";
      submitLogin.textContent = "Thành công!";

      setTimeout(() => {
        loginModal.style.display = "none";
        submitLogin.style.backgroundColor = "";
        submitLogin.textContent = "Đăng nhập";
        submitLogin.disabled = false;
        userIn.value = "";
        passIn.value = "";
      }, 500);
    } catch (error) {
      console.error("Lỗi đăng nhập Firebase:", error.code, error.message);
      errorMsg.textContent = "Tài khoản hoặc mật khẩu không chính xác!";
      errorMsg.style.display = "block";
    } finally {
      // Trường hợp thất bại hoặc không có quyền phải khôi phục nút ngay.
      if (submitLogin.textContent !== "Thành công!") {
        submitLogin.style.backgroundColor = "";
        submitLogin.textContent = "Đăng nhập";
        submitLogin.disabled = false;
      }
    }
  }

  if (submitLogin) {
    submitLogin.addEventListener("click", handleAdminLogin);
  }

  // Cho phép nhấn Enter trong ô mật khẩu để đăng nhập.
  if (passIn) {
    passIn.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAdminLogin();
      }
    });
  }

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

  function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatConferenceDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  function isConferenceAvailable(conf) {
    return Boolean(
      conf?.conferenceDate && conf.conferenceDate >= getLocalDateString(),
    );
  }

  function resetAuditoriumView() {
    activeConfId = "";
    chairmanContainer.innerHTML = "";

    document.querySelectorAll(".a-seat").forEach((seat) => {
      seat.classList.remove(
        "has-delegate",
        "seat-trung-uong",
        "seat-btv",
        "seat-bch",
        "seat-khac",
      );
      seat.removeAttribute("data-tooltip");
      seat.innerHTML = `<span class="seat-code">${seat.dataset.code}</span>`;
    });

    headerTitle.textContent = "SƠ ĐỒ HỘI TRƯỜNG";
    headerSubtitle.textContent = "Hội trường Tỉnh ủy";

    const totalChairsCount = document.querySelectorAll(".a-seat").length;
    document.getElementById("stat-total").textContent = totalChairsCount;
    document.getElementById("stat-selected").textContent = "0";
    document.getElementById("stat-empty").textContent = totalChairsCount;
    document.getElementById("stat-percent").textContent = "0.0%";

    const donutChart = document.getElementById("donut-chart");
    const chartPercentText = document.getElementById("chart-percent-text");
    if (donutChart && chartPercentText) {
      chartPercentText.textContent = "0.0%";
      donutChart.style.background =
        "conic-gradient(#922b21 0% 0%, #f4efe2 0% 100%)";
    }
  }

  function populatePublicConferenceSelect() {
    const availableConferences = globalConferences
      .filter(isConferenceAvailable)
      .sort((a, b) => {
        if (a.conferenceDate !== b.conferenceDate) {
          return a.conferenceDate.localeCompare(b.conferenceDate);
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
      });

    if (
      activeConfId &&
      !availableConferences.some((conf) => conf.id === activeConfId)
    ) {
      activeConfId = "";
    }

    viewConfSelect.innerHTML = "";

    if (availableConferences.length === 0) {
      viewConfSelect.innerHTML =
        '<option value="">-- Không có Hội nghị đang hoặc sắp diễn ra --</option>';
      resetAuditoriumView();
      return;
    }

    if (!activeConfId) {
      activeConfId = availableConferences[0].id;
    }

    availableConferences.forEach((conf) => {
      const opt = document.createElement("option");
      opt.value = conf.id;
      const roomText = conf.roomName || "Chưa có phòng";
      const dateText = formatConferenceDate(conf.conferenceDate);
      opt.textContent = `${dateText} — ${roomText} — ${conf.name}`;
      opt.selected = conf.id === activeConfId;
      viewConfSelect.appendChild(opt);
    });

    renderActiveConference();
  }

  onSnapshot(collection(db, "conferences"), (snapshot) => {
    globalConferences = [];
    snapshot.forEach((docSnap) => {
      globalConferences.push({ id: docSnap.id, ...docSnap.data() });
    });
    populatePublicConferenceSelect();
  });

  viewConfSelect.addEventListener("change", (e) => {
    activeConfId = e.target.value;
    if (activeConfId) renderActiveConference();
  });

  let lastConferenceFilterDate = getLocalDateString();
  setInterval(() => {
    const today = getLocalDateString();
    if (today !== lastConferenceFilterDate) {
      lastConferenceFilterDate = today;
      populatePublicConferenceSelect();
    }
  }, 60_000);

  function renderActiveConference() {
    const conf = globalConferences.find((c) => c.id === activeConfId);
    if (!conf) return;

    // Đổi tiêu đề Banner đầu trang theo Hội nghị đang chọn
    headerTitle.textContent = conf.name.toUpperCase();
    const subtitleParts = [];
    if (conf.roomName) subtitleParts.push(conf.roomName);
    const formattedDate = formatConferenceDate(conf.conferenceDate);
    if (formattedDate) subtitleParts.push(formattedDate);
    headerSubtitle.textContent =
      subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Hội trường Tỉnh ủy";
    // Reset tất cả ghế khán phòng về trạng thái trống ban đầu
    document.querySelectorAll(".a-seat").forEach((seat) => {
      seat.classList.remove(
        "has-delegate",
        "seat-trung-uong",
        "seat-btv",
        "seat-bch",
        "seat-khac",
      ); // THÊM CÁC CLASS CẦN XÓA Ở ĐÂY
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
        const item = {
          name: delInfo.name,
          seat: seatCode,
          category: delInfo.category || "",
        };
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
      cChairs.style.marginBottom = "5px"; // Ép khoảng cách âm để mặt bàn che bớt một phần chân ghế giống hệt hình mẫu
      cChairs.style.position = "relative";
      cChairs.style.zIndex = "1";
      const cTable = document.createElement("div");
      cTable.className = "chairman-table";
      cTable.style.position = "relative";
      cTable.style.zIndex = "2";

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

        const isAgency = del.category === "Sở, ban, ngành";

        // Với nhóm Sở, ban, ngành: không dùng tiền tố "Đ/c" / "Đồng chí".
        seat.innerHTML = isAgency
          ? `<div class="name-row" style="font-weight: bold; font-size: 12px; line-height: 1.1;">${shortName}</div>`
          : `
    <div class="title-row" style="font-size: 11px; opacity: 0.9; margin-bottom: 1px;">Đ/c</div>
    <div class="name-row" style="font-weight: bold; font-size: 12px; line-height: 1.1;">${shortName}</div>`;
        seat.setAttribute(
          "data-tooltip",
          isAgency ? del.name : `Đồng chí\n${del.name}`,
        );
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

    // 2. ĐỔ GHẾ KHÁN PHÒNG TỔNG HỢP (PHÂN CHIA MÀU THEO CHỨC VỤ)
    audienceDelegates.forEach((del) => {
      const seatEl = document.querySelector(`[data-code="${del.seat}"]`);
      if (seatEl) {
        selectedCount++;
        let shortName = del.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();
        const isAgency = del.category === "Sở, ban, ngành";
        seatEl.innerHTML = `<span class="seat-code">${del.seat}</span><span class="delegate-name">${isAgency ? shortName : `Đ/c ${shortName}`}</span>`;

        // Mặc định thêm class có người ngồi
        seatEl.classList.add("has-delegate");
        seatEl.setAttribute(
          "data-tooltip",
          isAgency ? del.name : `Đồng chí\n${del.name}`,
        );

        // Tìm lại thông tin gốc của đại biểu theo delId trong globalDelegates
        const delId = Object.keys(globalDelegates).find(
          (id) => globalDelegates[id].name === del.name,
        );
        const delRawInfo = delId ? globalDelegates[delId] : null;

        if (delRawInfo) {
          // SỬA TẠI ĐÂY: Ưu tiên đọc chính xác trường "category" từ Firestore của bạn, sau đó mới đến các trường dự phòng
          const positionText = (
            delRawInfo.category ||
            delRawInfo.position ||
            delRawInfo.role ||
            delRawInfo.type ||
            ""
          ).toLowerCase(); // Đã chuyển chuỗi về chữ viết thường toàn bộ để so sánh chính xác

          // SỬA TẠI ĐÂY: Chuyển toàn bộ từ khóa so sánh bên dưới thành CHỮ VIẾT THƯỜNG để khớp với lệnh .toLowerCase()
          if (
            positionText.includes("trung ương") ||
            positionText.includes("tw")
          ) {
            seatEl.classList.add("seat-trung-uong");
          } else if (
            positionText.includes("btv") ||
            positionText.includes("thường vụ")
          ) {
            seatEl.classList.add("seat-btv");
          } else if (
            positionText.includes("bch") ||
            positionText.includes("ban chấp hành") ||
            positionText.includes("đảng bộ tỉnh")
          ) {
            seatEl.classList.add("seat-bch");
          } else {
            seatEl.classList.add("seat-khac");
          }
        } else {
          // Phòng hờ nếu không tìm thấy thông tin chi tiết thì xếp vào nhóm Đại biểu khác
          seatEl.classList.add("seat-khac");
        }
      }
    });
    // ==========================================================================
    // TỰ ĐỘNG CẬP NHẬT CHỈ SỐ THỐNG KÊ & XOAY BIỂU ĐỒ HÌNH NHẪN (DASHBOARD) Realtime
    // ==========================================================================
    const totalChairsCount =
      document.querySelectorAll(".a-seat").length + seatsToShow.length;
    const emptyCount = totalChairsCount - selectedCount;
    const percent =
      totalChairsCount > 0
        ? ((selectedCount / totalChairsCount) * 100).toFixed(1)
        : 0;

    // Cập nhật giá trị văn bản chữ trên thẻ Sidebar
    document.getElementById("stat-total").textContent = totalChairsCount;
    document.getElementById("stat-selected").textContent = selectedCount;
    document.getElementById("stat-empty").textContent = emptyCount;
    document.getElementById("stat-percent").textContent = `${percent}%`;

    // Cập nhật vòng quay và số liệu trung tâm của biểu đồ hình nhẫn
    const donutChart = document.getElementById("donut-chart");
    const chartPercentText = document.getElementById("chart-percent-text");

    if (donutChart && chartPercentText) {
      chartPercentText.textContent = `${percent}%`;
      // Thiết lập dải quạt: Màu đỏ sẫm (#922b21) đại diện ghế có người và màu trắng ngà (#f4efe2) đại diện ghế trống
      donutChart.style.background = `conic-gradient(#922b21 0% ${percent}%, #f4efe2 ${percent}% 100%)`;
    }
  }

  // --- TÌM KIẾM ĐẠI BIỂU ---
  const searchInput = document.getElementById("search-delegate");
  if (searchInput) {
    let searchScrollTimer = null;

    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      let firstMatchedSeat = null;

      document.querySelectorAll(".seat-3d").forEach((seat) => {
        const tooltipText = seat.getAttribute("data-tooltip");
        const isMatched =
          searchTerm !== "" &&
          tooltipText &&
          tooltipText.toLowerCase().includes(searchTerm);

        if (isMatched) {
          seat.classList.add("highlight-seat");
          if (!firstMatchedSeat) firstMatchedSeat = seat;
        } else {
          seat.classList.remove("highlight-seat");
        }
      });

      // Tránh cuộn liên tục theo từng ký tự khi người dùng đang gõ.
      clearTimeout(searchScrollTimer);

      if (firstMatchedSeat) {
        searchScrollTimer = setTimeout(() => {
          firstMatchedSeat.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }, 280);
      }
    });
  }
});
